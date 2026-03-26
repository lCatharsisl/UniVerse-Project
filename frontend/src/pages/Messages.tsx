import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

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
  members: Array<{ user_id: number; first_name?: string; last_name?: string; email?: string; last_read_message_id?: number | null }>;
};

type Message = {
  message_id: number;
  sender_user_id: number;
  content?: string | null;
  created_at: string;
  attachments?: Array<{ attachment_id: number; file_url: string }>;
};

const Messages: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
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

  const formatTime = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
  };

  const fetchConversations = async () => {
    const res = await api.get('/messages/conversations');
    setConversations((res.data || []) as Conversation[]);
    if (!activeConversationId && res.data?.length) setActiveConversationId(res.data[0].conversation_id);
  };

  const fetchMessages = async (conversationId: number) => {
    const res = await api.get(`/messages/conversations/${conversationId}/messages`);
    setMessages((res.data || []) as Message[]);
    await api.post(`/messages/conversations/${conversationId}/read`);
  };

  useEffect(() => {
    fetchConversations().catch(() => {});
    const id = window.setInterval(() => {
      fetchConversations().catch(() => {});
      if (activeConversationId) fetchMessages(activeConversationId).catch(() => {});
    }, 8000);
    return () => window.clearInterval(id);
  }, [activeConversationId]);

  useEffect(() => {
    if (activeConversationId) fetchMessages(activeConversationId).catch(() => {});
  }, [activeConversationId]);

  useEffect(() => {
    if (activeConversationId) setMobilePane('chat');
  }, [activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.conversation_id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

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

  const sendMessage = async () => {
    if (!activeConversationId) return;
    if (!content.trim() && images.length === 0) return;
    const formData = new FormData();
    if (content.trim()) formData.append('content', content.trim());
    images.forEach((file) => formData.append('images', file));
    try {
      setError(null);
      await api.post(`/messages/conversations/${activeConversationId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setContent('');
      setImages([]);
      await fetchMessages(activeConversationId);
      await fetchConversations();
    } catch (e: any) {
      setError((e?.response?.data?.error as string) || t('messagesPage.sendFailed'));
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 p-3">
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
          {conversations.map((c) => (
            <button
              key={c.conversation_id}
              onClick={() => {
                setActiveConversationId(c.conversation_id);
                setMobilePane('chat');
              }}
              className={`w-full text-left rounded-xl border px-3 py-2 ${c.conversation_id === activeConversationId ? 'border-primary bg-primary/10' : 'border-uv-border'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-bold truncate">
                  {c.title || c.members.map((m) => m.first_name || m.email).join(', ')}
                </div>
                <div className="text-[10px] text-uv-gray shrink-0">{formatTime(c.last_message_created_at)}</div>
              </div>
              <div className="mt-1 text-xs text-uv-gray truncate">
                {c.last_message_content || t('messagesPage.noMessagesYet')}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-[11px] text-uv-gray">
                  {c.unread_count && c.unread_count > 0 ? t('messagesPage.newMessages') : t('messagesPage.upToDate')}
                </div>
                {!!c.unread_count && c.unread_count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-black">
                    {c.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={`border border-uv-border rounded-2xl p-3 flex flex-col min-h-0 ${mobilePane === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        {error && <div className="mb-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold px-2.5 py-2">{error}</div>}
        <div className="pb-2 border-b border-uv-border text-sm font-bold flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobilePane('list')}
            className="lg:hidden text-xs font-bold text-primary"
          >
            {t('common.back')}
          </button>
          {activeConversation ? activeConversation.title || t('messagesPage.conversation') : t('messagesPage.selectConversation')}
        </div>
        <div className="flex-1 overflow-auto py-3 space-y-2">
          {messages.map((m) => {
            const mine = !!user && m.sender_user_id === user.userId;
            const readLabel = getReadLabel(m.message_id, m.sender_user_id);
            return (
            <div key={m.message_id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-2xl border p-2.5 max-w-[85%] md:max-w-[70%] ${mine ? 'bg-primary/10 border-primary/20' : 'bg-white border-uv-border'}`}>
              {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
              {!!m.attachments?.length && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {m.attachments.map((a) => (
                    <img key={a.attachment_id} src={a.file_url} alt="attachment" className="w-full h-28 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div className="text-[11px] text-uv-gray mt-1 flex items-center justify-between gap-2">
                <span>{new Date(m.created_at).toLocaleString()}</span>
                {readLabel && <span className="font-bold text-primary">{readLabel}</span>}
              </div>
            </div>
            </div>
          );})}
        </div>
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
          <button onClick={() => sendMessage().catch(() => {})} className="uv-button">{t('messagesPage.send')}</button>
        </div>
      </section>
    </div>
  );
};

export default Messages;
