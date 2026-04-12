import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useMessagingUnread } from '../context/MessagingUnreadContext';
import { useTranslation } from 'react-i18next';
import { FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

type UserSearchRow = {
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type Conversation = {
  conversation_id: number;
  is_group: boolean;
  title?: string | null;
  unread_count?: number;
  last_message_content?: string | null;
  last_message_created_at?: string | null;
  last_message_sender_user_id?: number | null;
  members: Array<{
    user_id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar_url?: string | null;
    last_read_message_id?: number | null;
  }>;
};

type Message = {
  message_id: number;
  sender_user_id: number;
  content?: string | null;
  created_at: string;
  attachments?: Array<{ attachment_id: number; file_url: string }>;
};

function mapApiMessageToRow(raw: unknown): Message | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const messageId = Number(r.message_id);
  if (!Number.isFinite(messageId)) return null;
  const attachments = Array.isArray(r.attachments)
    ? (r.attachments as Record<string, unknown>[]).map((a) => ({
        attachment_id: Number(a.attachment_id),
        file_url: String(a.file_url ?? ''),
      }))
    : [];
  return {
    message_id: messageId,
    sender_user_id: Number(r.sender_user_id),
    content: r.content != null ? String(r.content) : null,
    created_at: String(r.created_at ?? ''),
    attachments,
  };
}

const Messages: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refreshMessagesUnreadCount } = useMessagingUnread();
  const [searchParams, setSearchParams] = useSearchParams();
  const dmParam = searchParams.get('dm');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchRow[]>([]);
  const [newGroup, setNewGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const activeConversationIdRef = useRef<number | null>(null);
  activeConversationIdRef.current = activeConversationId;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messageMenuOpenId, setMessageMenuOpenId] = useState<number | null>(null);

  useEffect(() => {
    setMessageMenuOpenId(null);
  }, [activeConversationId]);

  useEffect(() => {
    if (messageMenuOpenId == null) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-message-menu-root]')) setMessageMenuOpenId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [messageMenuOpenId]);

  const formatTime = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
  };

  const loadConversationMessages = useCallback(
    async (conversationId: number, opts?: { markRead?: boolean }) => {
      const res = await api.get(`/messages/conversations/${conversationId}/messages`, {
        params: { limit: 100 },
        timeout: 25000,
      });
      const raw = (res.data || []) as unknown[];
      const next = raw.map(mapApiMessageToRow).filter((m): m is Message => m != null);
      if (activeConversationIdRef.current !== conversationId) return;
      setMessages(next);
      if (opts?.markRead) {
        try {
          await api.post(`/messages/conversations/${conversationId}/read`, {}, { timeout: 15000 });
        } catch {
          /* non-fatal */
        }
        void refreshMessagesUnreadCount();
      }
    },
    [refreshMessagesUnreadCount]
  );

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations', { timeout: 25000 });
      const list = (res.data || []) as Conversation[];
      const unique = Array.from(new Map(list.map((c) => [c.conversation_id, c])).values());
      setConversations(unique);
      setActiveConversationId((prev) => {
        if (prev && unique.some((c) => c.conversation_id === prev)) return prev;
        if (prev && !unique.some((c) => c.conversation_id === prev)) return null;
        return null;
      });
      void refreshMessagesUnreadCount();
    } catch {
      /* keep UI */
    }
  }, [refreshMessagesUnreadCount]);

  useEffect(() => {
    fetchConversations().catch(() => {});
    const id = window.setInterval(() => {
      fetchConversations().catch(() => {});
      const cid = activeConversationIdRef.current;
      if (cid && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadConversationMessages(cid, { markRead: true }).catch(() => {});
      }
    }, 15000);
    return () => window.clearInterval(id);
  }, [fetchConversations, loadConversationMessages]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    loadConversationMessages(activeConversationId, { markRead: true }).catch(() => {});
  }, [activeConversationId, loadConversationMessages]);

  useEffect(() => {
    if (activeConversationId) setMobilePane('chat');
    else setMobilePane('list');
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeConversationId]);

  useEffect(() => {
    if (!dmParam || !user) return;
    const otherId = parseInt(dmParam, 10);
    if (Number.isNaN(otherId) || otherId < 1 || otherId === user.userId) {
      setSearchParams(
        (p) => {
          const next = new URLSearchParams(p);
          next.delete('dm');
          return next;
        },
        { replace: true }
      );
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await api.post('/messages/conversations', {
          participantIds: [otherId],
          isGroup: false,
        });
        const cid = res.data?.conversation_id as number | undefined;
        if (cancelled || !cid) return;
        const listRes = await api.get('/messages/conversations', { timeout: 25000 });
        const list = (listRes.data || []) as Conversation[];
        setConversations(Array.from(new Map(list.map((c) => [c.conversation_id, c])).values()));
        setActiveConversationId(cid);
        setMobilePane('chat');
        await loadConversationMessages(cid, { markRead: true }).catch(() => {});
        setSearchParams(
          (p) => {
            const next = new URLSearchParams(p);
            next.delete('dm');
            return next;
          },
          { replace: true }
        );
      } catch (e: unknown) {
        if (!cancelled) {
          const err = e as { response?: { data?: { error?: string } } };
          setError(err?.response?.data?.error || t('messagesPage.dmOpenFailed'));
          setSearchParams(
            (p) => {
              const next = new URLSearchParams(p);
              next.delete('dm');
              return next;
            },
            { replace: true }
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dmParam, user?.userId, setSearchParams, t, loadConversationMessages]);

  const conversationTitle = (c: Conversation) => {
    if (c.title) return c.title;
    if (!user) return c.members.map((m) => m.first_name || m.email).join(', ');
    if (c.is_group) return c.members.map((m) => m.first_name || m.email).join(', ');
    const other = c.members.find((m) => m.user_id !== user.userId);
    if (other) {
      const name = [other.first_name, other.last_name].filter(Boolean).join(' ').trim();
      return name || other.email || t('messagesPage.user');
    }
    return c.members.map((m) => m.first_name || m.email).join(', ');
  };

  const conversationListAvatar = (c: Conversation): { url?: string | null; letter: string } => {
    if (!user) return { letter: '?' };
    const others = c.members.filter((m) => m.user_id !== user.userId);
    const primary = others[0];
    if (!primary) return { letter: '?' };
    const letter = (primary.first_name || primary.email || '?').trim().charAt(0).toUpperCase() || '?';
    return { url: primary.avatar_url, letter };
  };

  const activeConversation = useMemo(
    () => conversations.find((c) => c.conversation_id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const activeHeaderAvatar =
    activeConversation && user ? conversationListAvatar(activeConversation) : null;

  const getReadLabel = (messageId: number, senderUserId: number) => {
    if (!activeConversation || !user || senderUserId !== user.userId) return null;
    const others = activeConversation.members.filter((m) => m.user_id !== user.userId);
    if (others.length === 0) return null;
    const readBy = others.filter((m) => (m.last_read_message_id || 0) >= messageId).length;
    if (activeConversation.is_group) {
      return `Read by ${readBy}/${others.length}`;
    }
    return readBy > 0 ? t('messagesPage.read') : t('messagesPage.sent');
  };

  /** True if any other participant has read up to this message (same rule as “read” label). */
  const isMessageReadByOthers = (messageId: number) => {
    if (!activeConversation || !user) return false;
    const others = activeConversation.members.filter((m) => m.user_id !== user.userId);
    return others.some((m) => (m.last_read_message_id || 0) >= messageId);
  };

  const handleSearch = async (q: string) => {
    setSearchText(q);
    if (!q.trim()) return setSearchResults([]);
    const res = await api.get('/messages/users/search', { params: { q, limit: 8 } });
    setSearchResults((res.data || []) as UserSearchRow[]);
  };

  const createConversation = async () => {
    setError(null);
    if (selectedUsers.length === 0) {
      setError(t('messagesPage.selectAtLeastOneUser'));
      return;
    }
    try {
      const res = await api.post('/messages/conversations', {
        participantIds: selectedUsers,
        isGroup: newGroup,
        title: newGroup ? groupTitle : undefined,
      });
      const conversationId = res.data?.conversation_id as number;
      setSelectedUsers([]);
      setGroupTitle('');
      setSearchText('');
      setSearchResults([]);
      await fetchConversations();
      if (conversationId) setActiveConversationId(conversationId);
    } catch (e: any) {
      setError((e?.response?.data?.error as string) || t('messagesPage.startChatFailed'));
    }
  };

  const deleteConversation = async (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await themedConfirm(t('messagesPage.deleteChatConfirm')))) return;
    try {
      await api.delete(`/messages/conversations/${c.conversation_id}`);
      if (activeConversationId === c.conversation_id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      await fetchConversations();
      void refreshMessagesUnreadCount();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      await themedAlert(e?.response?.data?.error || t('messagesPage.deleteChatFailed'));
    }
  };

  const deleteActiveConversation = async () => {
    if (!activeConversation) return;
    if (!(await themedConfirm(t('messagesPage.deleteChatConfirm')))) return;
    try {
      await api.delete(`/messages/conversations/${activeConversation.conversation_id}`);
      setActiveConversationId(null);
      setMessages([]);
      await fetchConversations();
      void refreshMessagesUnreadCount();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      await themedAlert(e?.response?.data?.error || t('messagesPage.deleteChatFailed'));
    }
  };

  const unsendMessage = async (messageId: number, confirmKey: 'unsendConfirm' | 'deleteMessageConfirm' = 'unsendConfirm') => {
    if (!activeConversationId) return;
    if (!(await themedConfirm(t(`messagesPage.${confirmKey}`)))) return;
    try {
      await api.delete(`/messages/conversations/${activeConversationId}/messages/${messageId}`);
      setMessageMenuOpenId(null);
      setMessages((prev) => prev.filter((m) => m.message_id !== messageId));
      await fetchConversations();
      void refreshMessagesUnreadCount();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      await themedAlert(e?.response?.data?.error || t('messagesPage.unsendFailed'));
    }
  };

  const sendMessage = async () => {
    if (!activeConversationId) return;
    if (!content.trim() && images.length === 0) return;
    if (sending) return;

    const convId = activeConversationId;
    const draftText = content.trim();
    const draftFiles = [...images];

    setError(null);
    setSending(true);
    setContent('');
    setImages([]);

    const formData = new FormData();
    if (draftText) formData.append('content', draftText);
    draftFiles.forEach((file) => formData.append('images', file));

    try {
      const res = await api.post(`/messages/conversations/${convId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const added = mapApiMessageToRow(res.data);
      if (added) {
        setMessages((prev) => (prev.some((m) => m.message_id === added.message_id) ? prev : [...prev, added]));
      } else {
        await loadConversationMessages(convId, { markRead: true });
      }
      void fetchConversations().catch(() => {});
    } catch (e: any) {
      setContent(draftText);
      setImages(draftFiles);
      setError((e?.response?.data?.error as string) || t('messagesPage.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 p-3 [contain:layout]">
      <aside className={`border border-uv-border rounded-2xl p-3 overflow-auto ${mobilePane === 'chat' ? 'hidden lg:block' : 'block'}`}>
        <h2 className="text-lg font-black mb-2">{t('messagesPage.title')}</h2>
        {error && <div className="mb-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold px-2.5 py-2">{error}</div>}
        <div className="space-y-2 mb-3">
          <input
            value={searchText}
            onChange={(e) => handleSearch(e.target.value).catch(() => {})}
            placeholder={t('messagesPage.searchUsers')}
            className="w-full rounded-xl border border-uv-border px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={newGroup} onChange={(e) => setNewGroup(e.target.checked)} />
            {t('messagesPage.groupChat')}
          </label>
          {newGroup && (
            <input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder={t('messagesPage.groupTitle')}
              className="w-full rounded-xl border border-uv-border px-3 py-2 text-sm"
            />
          )}
          <div className="space-y-1 max-h-40 overflow-auto">
            {searchResults.map((u) => {
              const checked = selectedUsers.includes(u.user_id);
              return (
                <label key={u.user_id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedUsers((prev) =>
                        e.target.checked ? [...prev, u.user_id] : prev.filter((x) => x !== u.user_id)
                      )
                    }
                  />
                  <span>{(u.first_name || u.email || t('messagesPage.user')) + (u.last_name ? ` ${u.last_name}` : '')}</span>
                </label>
              );
            })}
          </div>
          <button onClick={() => createConversation().catch(() => {})} className="uv-button w-full">
            {t('messagesPage.startChat')}
          </button>
        </div>

        <div className="space-y-2">
          {conversations.map((c) => {
            const { url: avUrl, letter: avLetter } = conversationListAvatar(c);
            const unreadN = Number(c.unread_count) || 0;
            return (
              <div
                key={c.conversation_id}
                className={`w-full rounded-xl border flex gap-1 items-stretch group ${c.conversation_id === activeConversationId ? 'border-primary bg-primary/10' : 'border-uv-border'}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveConversationId(c.conversation_id);
                    setMobilePane('chat');
                  }}
                  className="flex-1 min-w-0 text-left px-2.5 py-2 flex gap-3 items-start"
                >
                  <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden bg-primary/10 border border-uv-border flex items-center justify-center text-sm font-black text-primary">
                    {avUrl ? (
                      <img src={avUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      avLetter
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold truncate">{conversationTitle(c)}</div>
                      <div className="text-[10px] text-uv-gray shrink-0">{formatTime(c.last_message_created_at)}</div>
                    </div>
                    <div className="mt-1 text-xs text-uv-gray truncate">
                      {c.last_message_content || t('messagesPage.noMessagesYet')}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-uv-gray">
                        {unreadN > 0 ? t('messagesPage.newMessages') : t('messagesPage.upToDate')}
                      </div>
                      {unreadN > 0 && (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-black">
                          {unreadN}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  title={t('messagesPage.deleteChat')}
                  className="shrink-0 self-stretch px-2 rounded-r-xl text-uv-gray hover:text-red-600 hover:bg-red-50 opacity-70 group-hover:opacity-100"
                  onClick={(e) => deleteConversation(c, e)}
                >
                  <FiTrash2 size={16} className="mx-auto" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <section
        className={`border border-uv-border rounded-2xl p-3 flex flex-col min-h-0 min-w-0 overscroll-y-contain ${mobilePane === 'list' ? 'hidden lg:flex' : 'flex'}`}
      >
        {error && <div className="mb-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold px-2.5 py-2">{error}</div>}
        <div className="pb-2 border-b border-uv-border text-sm font-bold flex items-center justify-between gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobilePane('list')}
            className="lg:hidden text-xs font-bold text-primary shrink-0"
          >
            {t('common.back')}
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end lg:justify-start">
            {activeConversation && user && activeHeaderAvatar ? (
              <>
                <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-primary/10 border border-uv-border flex items-center justify-center text-xs font-black text-primary">
                  {activeHeaderAvatar.url ? (
                    <img src={activeHeaderAvatar.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    activeHeaderAvatar.letter
                  )}
                </div>
                <span className="truncate flex-1 min-w-0">{conversationTitle(activeConversation)}</span>
                <button
                  type="button"
                  title={t('messagesPage.deleteChat')}
                  className="shrink-0 p-2 rounded-xl text-uv-gray hover:text-red-600 hover:bg-red-50"
                  onClick={() => deleteActiveConversation().catch(() => {})}
                >
                  <FiTrash2 size={18} />
                </button>
              </>
            ) : (
              <span className="truncate text-uv-gray">{t('messagesPage.selectConversation')}</span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-2 min-h-0 scroll-smooth">
          {!activeConversationId ? (
            <div className="flex flex-col items-center justify-center min-h-[min(50vh,280px)] px-4 text-center">
              <p className="text-sm font-bold text-uv-gray max-w-sm leading-relaxed">{t('messagesPage.pickConversationHint')}</p>
            </div>
          ) : (
            <>
              {messages.map((m) => {
                const mine = !!user && m.sender_user_id === user.userId;
                const readLabel = getReadLabel(m.message_id, m.sender_user_id);
                const canUnsend = mine && !isMessageReadByOthers(m.message_id);
                return (
                  <div key={m.message_id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`rounded-2xl border p-2.5 max-w-[85%] md:max-w-[70%] ${mine ? 'bg-primary/10 border-primary/20' : 'bg-white border-uv-border'}`}
                    >
                      {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                      {!!m.attachments?.length && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {m.attachments.map((a) => (
                            <img
                              key={a.attachment_id}
                              src={resolveMediaUrl(a.file_url)}
                              alt="attachment"
                              className="w-full h-28 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                      <div className="text-[11px] text-uv-gray mt-1 flex items-center justify-between gap-2 flex-wrap">
                        <span>{new Date(m.created_at).toLocaleString()}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {readLabel && <span className="font-bold text-primary">{readLabel}</span>}
                          {mine && (
                            <div className="relative" data-message-menu-root>
                              <button
                                type="button"
                                aria-expanded={messageMenuOpenId === m.message_id}
                                aria-haspopup="menu"
                                aria-label={t('messagesPage.messageActionsMenu')}
                                className="p-0.5 rounded-md text-uv-gray/45 hover:text-uv-gray hover:bg-black/5 opacity-60 hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMessageMenuOpenId((id) => (id === m.message_id ? null : m.message_id));
                                }}
                              >
                                <FiMoreHorizontal size={16} strokeWidth={2.25} />
                              </button>
                              {messageMenuOpenId === m.message_id && (
                                <div
                                  role="menu"
                                  className="absolute right-0 bottom-full mb-1 z-30 min-w-[9.5rem] rounded-xl border border-uv-border bg-white py-1 shadow-lg"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={!canUnsend}
                                    title={canUnsend ? undefined : t('messagesPage.unsendDisabledRead')}
                                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-uv-black hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      if (!canUnsend) return;
                                      unsendMessage(m.message_id, 'unsendConfirm').catch(() => {});
                                    }}
                                  >
                                    {t('messagesPage.menuUnsend')}
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={!canUnsend}
                                    title={canUnsend ? undefined : t('messagesPage.unsendDisabledRead')}
                                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      if (!canUnsend) return;
                                      unsendMessage(m.message_id, 'deleteMessageConfirm').catch(() => {});
                                    }}
                                  >
                                    {t('messagesPage.menuDelete')}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
            </>
          )}
        </div>
        {activeConversationId ? (
          <div className="pt-2 border-t border-uv-border space-y-2 pb-[max(env(safe-area-inset-bottom),8px)]">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('messagesPage.writeMessage')}
              className="w-full min-h-[72px] rounded-xl border border-uv-border px-3 py-2 text-sm"
            />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files || []))}
              className="text-xs"
            />
            <button
              type="button"
              disabled={sending}
              onClick={() => sendMessage().catch(() => {})}
              className="uv-button disabled:opacity-60 disabled:pointer-events-none"
            >
              {sending ? t('messagesPage.sending') : t('messagesPage.send')}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default Messages;
