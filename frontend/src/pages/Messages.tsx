import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiArrowRight,
  FiBell,
  FiCheck,
  FiDownload,
  FiImage,
  FiExternalLink,
  FiInfo,
  FiLink,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPaperclip,
  FiPlus,
  FiSearch,
  FiSend,
  FiTrash2,
  FiUsers,
  FiX,
  FiZoomIn,
  FiZoomOut,
} from 'react-icons/fi';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAuthUserAvatarUrl, getAuthUserInitials } from '../utils/authUserDisplay';
import { useMessagingUnread } from '../context/MessagingUnreadContext';
import { useTranslation } from 'react-i18next';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import { NavIconBadge } from '../components/NavIconBadge';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
type UserSearchRow = {
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
};

type ConversationMember = {
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
  last_read_message_id?: number | null;
};

type Conversation = {
  conversation_id: number;
  is_group: boolean;
  title?: string | null;
  unread_count?: number;
  last_message_content?: string | null;
  last_message_created_at?: string | null;
  last_message_sender_user_id?: number | null;
  /** Current user's mute preference for this thread */
  notifications_muted?: boolean;
  members: ConversationMember[];
};

type SharedAttachment = {
  attachment_id: number;
  message_id: number;
  file_url: string;
  file_type: string;
  message_created_at: string;
  sender_user_id: number;
};

type SharedLink = {
  url: string;
  message_id: number;
  created_at: string;
  sender_user_id: number;
  sender_first_name: string;
  sender_last_name: string;
};

type MessageAttachment = {
  attachment_id: number;
  file_url: string;
};

type Message = {
  message_id: number;
  sender_user_id: number;
  sender_first_name?: string | null;
  sender_last_name?: string | null;
  sender_avatar_url?: string | null;
  content?: string | null;
  created_at: string;
  attachments?: MessageAttachment[];
};

type MediaViewerState = {
  items: string[];
  index: number;
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
    sender_first_name: r.sender_first_name != null ? String(r.sender_first_name) : null,
    sender_last_name: r.sender_last_name != null ? String(r.sender_last_name) : null,
    sender_avatar_url: r.sender_avatar_url != null ? String(r.sender_avatar_url) : null,
    content: r.content != null ? String(r.content) : null,
    created_at: String(r.created_at ?? ''),
    attachments,
  };
}

function formatRelativeTimestamp(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

function getDisplayName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || fallback || 'User';
}

function getInitials(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join('');
  return initials || '?';
}

/** `resolveMediaUrl` boş dönebilir (silinmiş eski /uploads/avatar-* yolları); `src=""` verme. */
function mediaImageSrc(path: string | null | undefined): string {
  return resolveMediaUrl(path);
}

function dedupeConversationMembers(members: ConversationMember[] | undefined): ConversationMember[] {
  if (!members?.length) return [];
  const byId = new Map<number, ConversationMember>();
  for (const m of members) {
    if (!byId.has(m.user_id)) byId.set(m.user_id, m);
  }
  return Array.from(byId.values());
}

function readStoredFlag(key: string, fallback = true) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value == null) return fallback;
  return value === '1';
}

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const Messages: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const { refreshMessagesUnreadCount } = useMessagingUnread();
  const [searchParams, setSearchParams] = useSearchParams();
  const dmParam = searchParams.get('dm');
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    readStoredJson<Conversation[]>('messages:conversation-cache', [])
  );
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [conversationQuery, setConversationQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchRow[]>([]);
  const [newGroup, setNewGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(
    () => readStoredJson<Conversation[]>('messages:conversation-cache', []).length === 0
  );
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageMenuOpenId, setMessageMenuOpenId] = useState<number | null>(null);
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState | null>(null);
  const [mediaZoom, setMediaZoom] = useState(1);
  const [showNewChatPanel, setShowNewChatPanel] = useState(() => readStoredFlag('messages:show-new-chat', true));
  const [showInfoPanel, setShowInfoPanel] = useState(() => readStoredFlag('messages:show-info-panel', false));
  const [infoSubPanel, setInfoSubPanel] = useState<'main' | 'search' | 'media'>('main');
  const [inChatSearchQ, setInChatSearchQ] = useState('');
  const [inChatSearchLoading, setInChatSearchLoading] = useState(false);
  const [inChatSearchResults, setInChatSearchResults] = useState<Message[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedAttachments, setSharedAttachments] = useState<SharedAttachment[]>([]);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [notifToggling, setNotifToggling] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null);
  const activeConversationIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesCacheRef = useRef<Record<number, Message[]>>({});

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    setInfoSubPanel('main');
    setInChatSearchQ('');
    setInChatSearchResults([]);
    setSharedAttachments([]);
    setSharedLinks([]);
  }, [activeConversationId]);

  useEffect(() => {
    if (highlightMessageId == null) return;
    const id = window.setTimeout(() => setHighlightMessageId(null), 2200);
    return () => window.clearTimeout(id);
  }, [highlightMessageId]);

  useEffect(() => {
    setMessageMenuOpenId(null);
  }, [activeConversationId]);

  useEffect(() => {
    if (messageMenuOpenId == null) return;
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-message-menu-root]')) setMessageMenuOpenId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [messageMenuOpenId]);
  useEffect(() => {
    if (!mediaViewer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMediaViewer(null);
        setMediaZoom(1);
      }
      if (event.key === 'ArrowLeft') {
        setMediaViewer((current) => {
          if (!current || current.items.length <= 1) return current;
          return {
            ...current,
            index: (current.index - 1 + current.items.length) % current.items.length,
          };
        });
        setMediaZoom(1);
      }
      if (event.key === 'ArrowRight') {
        setMediaViewer((current) => {
          if (!current || current.items.length <= 1) return current;
          return {
            ...current,
            index: (current.index + 1) % current.items.length,
          };
        });
        setMediaZoom(1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mediaViewer]);

  const imagePreviews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('messages:show-new-chat', showNewChatPanel ? '1' : '0');
  }, [showNewChatPanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('messages:show-info-panel', showInfoPanel ? '1' : '0');
  }, [showInfoPanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('messages:conversation-cache', JSON.stringify(conversations));
  }, [conversations]);

  const conversationTitle = useCallback(
    (conversation: Conversation) => {
      if (conversation.title) return conversation.title;
      if (!user) return conversation.members.map((member) => member.first_name || member.email).join(', ');
      if (conversation.is_group) return conversation.members.map((member) => member.first_name || member.email).join(', ');
      const other = conversation.members.find((member) => member.user_id !== user.userId);
      if (other) {
        return getDisplayName(other.first_name, other.last_name, other.email || t('messagesPage.user'));
      }
      return conversation.members.map((member) => member.first_name || member.email).join(', ');
    },
    [t, user]
  );

  const conversationAvatar = useCallback(
    (conversation: Conversation) => {
      if (!user) return { label: '?', url: null as string | null };
      const others = conversation.members.filter((member) => member.user_id !== user.userId);
      if (conversation.is_group) {
        const label = conversation.title || others.map((member) => member.first_name || member.email).join(', ') || t('messagesPage.groupChat');
        return { label, url: null as string | null };
      }
      const primary = others[0];
      if (!primary) return { label: '?', url: null as string | null };
      return {
        label: getDisplayName(primary.first_name, primary.last_name, primary.email || t('messagesPage.user')),
        url: primary.avatar_url || null,
      };
    },
    [t, user]
  );

  /** Birebir sohbette karşıdaki kullanıcı (grupta yok) */
  const getDmPeerUserId = useCallback(
    (c: Conversation): number | null => {
      if (!user || c.is_group) return null;
      const other = c.members.find((m) => m.user_id !== user.userId);
      return other?.user_id ?? null;
    },
    [user]
  );

  const loadConversationMessages = useCallback(
    async (conversationId: number, opts?: { markRead?: boolean; silent?: boolean; anchorMessageId?: number }) => {
      const hasAnchor = opts?.anchorMessageId != null;
      const cachedMessages = messagesCacheRef.current[conversationId];
      if (!hasAnchor && cachedMessages && activeConversationIdRef.current === conversationId) {
        setMessages(cachedMessages);
      }
      if (!opts?.silent && (!cachedMessages || hasAnchor) && activeConversationIdRef.current === conversationId) {
        setLoadingMessages(true);
      }
      try {
        const params: Record<string, number> = { limit: hasAnchor ? 120 : 100 };
        if (hasAnchor) params.anchorMessageId = opts!.anchorMessageId!;
        const res = await api.get(`/messages/conversations/${conversationId}/messages`, {
          params,
          timeout: 25000,
        });
        const raw = (res.data || []) as unknown[];
        const next = raw.map(mapApiMessageToRow).filter((message): message is Message => message != null);
        if (activeConversationIdRef.current !== conversationId) return;
        if (!hasAnchor) {
          messagesCacheRef.current[conversationId] = next;
        } else {
          messagesCacheRef.current[conversationId] = next;
        }
        setMessages(next);
        if (opts?.markRead) {
          void api
            .post(`/messages/conversations/${conversationId}/read`, {}, { timeout: 15000 })
            .then(() => {
              void refreshMessagesUnreadCount();
            })
            .catch(() => {
              /* non-fatal */
            });
        }
      } finally {
        if (activeConversationIdRef.current === conversationId) {
          setLoadingMessages(false);
        }
      }
    },
    [refreshMessagesUnreadCount]
  );

  const fetchConversations = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent && conversations.length === 0) {
        setLoadingConversations(true);
      }
      const res = await api.get('/messages/conversations', { timeout: 25000 });
      const list = (res.data || []) as Conversation[];
      const unique = Array.from(new Map(list.map((conversation) => [conversation.conversation_id, conversation])).values());
      setConversations(unique);
      setActiveConversationId((prev) => {
        if (prev && unique.some((conversation) => conversation.conversation_id === prev)) return prev;
        if (!prev && unique.length === 1) return unique[0].conversation_id;
        return null;
      });
      void refreshMessagesUnreadCount();
    } catch {
      /* keep UI */
    } finally {
      if (!opts?.silent) {
        setLoadingConversations(false);
      }
    }
  }, [conversations.length, refreshMessagesUnreadCount]);

  useEffect(() => {
    fetchConversations({ silent: conversations.length > 0 }).catch(() => {});
    const id = window.setInterval(() => {
      fetchConversations({ silent: true }).catch(() => {});
      const conversationId = activeConversationIdRef.current;
      if (conversationId && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadConversationMessages(conversationId, { markRead: true, silent: true }).catch(() => {});
      }
    }, 15000);
    return () => window.clearInterval(id);
  }, [conversations.length, fetchConversations, loadConversationMessages]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setLoadingMessages(false);
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
        (params) => {
          const next = new URLSearchParams(params);
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
        const created = res.data as Conversation | undefined;
        const conversationId = created?.conversation_id;
        if (cancelled || conversationId == null || !created) return;
        setConversations((prev) => {
          const map = new Map(prev.map((c) => [c.conversation_id, c]));
          map.set(conversationId, created);
          return Array.from(map.values());
        });
        setActiveConversationId(conversationId);
        setMobilePane('chat');
        setSearchParams(
          (params) => {
            const next = new URLSearchParams(params);
            next.delete('dm');
            return next;
          },
          { replace: true }
        );
      } catch (err: unknown) {
        if (!cancelled) {
          const errorResponse = err as { response?: { data?: { error?: string } } };
          setError(errorResponse?.response?.data?.error || t('messagesPage.dmOpenFailed'));
          setSearchParams(
            (params) => {
              const next = new URLSearchParams(params);
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
  }, [dmParam, setSearchParams, t, user]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.conversation_id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const activeMembers = useMemo(() => {
    if (!activeConversation || !user) return [];
    const seen = new Set<number>();
    const out: ConversationMember[] = [];
    for (const member of activeConversation.members) {
      if (member.user_id === user.userId) continue;
      if (seen.has(member.user_id)) continue;
      seen.add(member.user_id);
      out.push(member);
    }
    return out;
  }, [activeConversation, user]);

  const activeConversationMembersDeduped = useMemo(
    () => (activeConversation ? dedupeConversationMembers(activeConversation.members) : []),
    [activeConversation]
  );

  const groupTotalMemberCount = useMemo(
    () => (activeConversation?.is_group ? activeConversationMembersDeduped.length : 0),
    [activeConversation?.is_group, activeConversationMembersDeduped]
  );

  const membersForInfoList = useMemo(() => {
    if (!user) return activeConversationMembersDeduped;
    return [...activeConversationMembersDeduped].sort((a, b) => {
      if (a.user_id === user.userId) return -1;
      if (b.user_id === user.userId) return 1;
      return getDisplayName(a.first_name, a.last_name, a.email || '')
        .localeCompare(getDisplayName(b.first_name, b.last_name, b.email || ''), undefined, { sensitivity: 'base' });
    });
  }, [activeConversationMembersDeduped, user]);

  useEffect(() => {
    if (infoSubPanel !== 'search' || !activeConversationId) return;
    const q = inChatSearchQ.trim();
    if (q.length < 1) {
      setInChatSearchResults([]);
      setInChatSearchLoading(false);
      return;
    }
    setInChatSearchLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const cid = activeConversationId;
        if (!cid) return;
        try {
          const res = await api.get(`/messages/conversations/${cid}/messages/search`, {
            params: { q, limit: 50 },
            timeout: 20000,
          });
          if (activeConversationIdRef.current !== cid) return;
          const raw = (res.data || []) as unknown[];
          const next = raw.map(mapApiMessageToRow).filter((message): message is Message => message != null);
          setInChatSearchResults(next);
        } catch {
          if (activeConversationIdRef.current === cid) setInChatSearchResults([]);
        } finally {
          if (activeConversationIdRef.current === cid) setInChatSearchLoading(false);
        }
      })();
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [inChatSearchQ, infoSubPanel, activeConversationId]);

  useEffect(() => {
    if (infoSubPanel !== 'media' || !activeConversationId) return;
    let cancelled = false;
    setSharedLoading(true);
    void (async () => {
      const cid = activeConversationId;
      if (!cid) return;
      try {
        const res = await api.get(`/messages/conversations/${cid}/shared`, {
          params: { limit: 80 },
          timeout: 20000,
        });
        if (cancelled) return;
        if (activeConversationIdRef.current !== cid) return;
        setSharedAttachments((res.data?.attachments || []) as SharedAttachment[]);
        setSharedLinks((res.data?.links || []) as SharedLink[]);
      } catch {
        if (!cancelled && activeConversationIdRef.current === cid) {
          setSharedAttachments([]);
          setSharedLinks([]);
        }
      } finally {
        if (!cancelled && activeConversationIdRef.current === cid) {
          setSharedLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [infoSubPanel, activeConversationId]);

  const filteredConversations = useMemo(() => {
    const query = conversationQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const title = conversationTitle(conversation).toLowerCase();
      const snippet = (conversation.last_message_content || '').toLowerCase();
      return title.includes(query) || snippet.includes(query);
    });
  }, [conversationQuery, conversationTitle, conversations]);

  const selectedUserRows = useMemo(
    () => searchResults.filter((row) => selectedUsers.includes(row.user_id)),
    [searchResults, selectedUsers]
  );

  const activeHeaderAvatar = activeConversation ? conversationAvatar(activeConversation) : null;

  const getReadLabel = (messageId: number, senderUserId: number) => {
    if (!activeConversation || !user || senderUserId !== user.userId) return null;
    const others = activeMembers;
    if (others.length === 0) return null;
    const readBy = others.filter((member) => (member.last_read_message_id || 0) >= messageId).length;
    if (activeConversation.is_group) {
      return `Read by ${readBy}/${others.length}`;
    }
    return readBy > 0 ? t('messagesPage.read') : t('messagesPage.sent');
  };

  const isMessageReadByOthers = (messageId: number) => {
    if (!activeConversation || !user) return false;
    return activeMembers.some((member) => (member.last_read_message_id || 0) >= messageId);
  };

  const handleSearch = async (query: string) => {
    setSearchText(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const res = await api.get('/messages/users/search', { params: { q: query, limit: 8 } });    setSearchResults((res.data || []) as UserSearchRow[]);
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
    } catch (err: any) {
      setError((err?.response?.data?.error as string) || t('messagesPage.startChatFailed'));
    }
  };

  const deleteConversation = async (conversation: Conversation, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!(await themedConfirm(t('messagesPage.deleteChatConfirm')))) return;
    try {
      await api.delete(`/messages/conversations/${conversation.conversation_id}`);
      if (activeConversationId === conversation.conversation_id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      await fetchConversations();
      void refreshMessagesUnreadCount();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string } } };
      await themedAlert(errorResponse?.response?.data?.error || t('messagesPage.deleteChatFailed'));
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
      const errorResponse = err as { response?: { data?: { error?: string } } };
      await themedAlert(errorResponse?.response?.data?.error || t('messagesPage.deleteChatFailed'));
    }
  };

  const unsendMessage = async (
    messageId: number,
    confirmKey: 'unsendConfirm' | 'deleteMessageConfirm' = 'unsendConfirm'
  ) => {
    if (!activeConversationId) return;
    if (!(await themedConfirm(t(`messagesPage.${confirmKey}`)))) return;
    try {
      await api.delete(`/messages/conversations/${activeConversationId}/messages/${messageId}`);
      setMessageMenuOpenId(null);
      setMessages((prev) => prev.filter((message) => message.message_id !== messageId));
      await fetchConversations();
      void refreshMessagesUnreadCount();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string } } };
      await themedAlert(errorResponse?.response?.data?.error || t('messagesPage.unsendFailed'));
    }
  };
  const sendMessage = async () => {
    if (!activeConversationId) return;
    if (!content.trim() && images.length === 0) return;
    if (sending) return;

    const conversationId = activeConversationId;
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
      const res = await api.post(`/messages/conversations/${conversationId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const added = mapApiMessageToRow(res.data);
      if (added) {
        setMessages((prev) => (prev.some((message) => message.message_id === added.message_id) ? prev : [...prev, added]));
      } else {
        await loadConversationMessages(conversationId, { markRead: true });
      }
      void fetchConversations().catch(() => {});
    } catch (err: any) {
      setContent(draftText);
      setImages(draftFiles);
      setError((err?.response?.data?.error as string) || t('messagesPage.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage().catch(() => {});
    }
  };

  const removeSelectedImage = (fileName: string) => {
    setImages((prev) => prev.filter((file) => file.name !== fileName));
  };

  const mediaItems = useMemo(
    () =>
      messages
        .flatMap((message) =>
          (message.attachments || []).map((attachment) => mediaImageSrc(attachment.file_url))
        )
        .filter((u) => u.length > 0),
    [messages]
  );

  const openMediaViewer = (url: string) => {
    const index = mediaItems.indexOf(url);
    setMediaZoom(1);
    setMediaViewer({
      items: mediaItems.length > 0 ? mediaItems : [url],
      index: index >= 0 ? index : 0,
    });
  };

  const currentMediaUrl = mediaViewer ? mediaViewer.items[mediaViewer.index] : null;

  const stepMedia = (direction: -1 | 1) => {
    setMediaViewer((current) => {
      if (!current || current.items.length <= 1) return current;
      return {
        ...current,
        index: (current.index + direction + current.items.length) % current.items.length,
      };
    });
    setMediaZoom(1);
  };

  const closeMediaViewer = () => {
    setMediaViewer(null);
    setMediaZoom(1);
  };

  const zoomIn = () => setMediaZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))));
  const zoomOut = () => setMediaZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))));

  const scrollToMessageInView = (messageId: number) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const goToMessageFromSearch = useCallback(
    async (messageId: number) => {
      if (!activeConversationId) return;
      setInfoSubPanel('main');
      if (typeof window !== 'undefined' && window.innerWidth < 1536) {
        setShowInfoPanel(false);
      }
      const inList = messages.some((m) => m.message_id === messageId);
      if (inList) {
        setHighlightMessageId(messageId);
        setTimeout(() => scrollToMessageInView(messageId), 60);
        return;
      }
      await loadConversationMessages(activeConversationId, { anchorMessageId: messageId, markRead: true });
      setHighlightMessageId(messageId);
      setTimeout(() => scrollToMessageInView(messageId), 150);
    },
    [activeConversationId, messages, loadConversationMessages]
  );

  const openSharedInViewer = useCallback(
    (fileUrl: string) => {
      const items = sharedAttachments.map((a) => resolveMediaUrl(a.file_url));
      const resolved = resolveMediaUrl(fileUrl);
      const index = items.findIndex((u) => u === resolved);
      setMediaZoom(1);
      setMediaViewer({
        items: items.length > 0 ? items : [resolved],
        index: index >= 0 ? index : 0,
      });
    },
    [sharedAttachments]
  );

  const toggleNotificationsMuted = async () => {
    if (!activeConversation || notifToggling) return;
    const next = !activeConversation.notifications_muted;
    setNotifToggling(true);
    try {
      await api.patch(`/messages/conversations/${activeConversation.conversation_id}/notifications`, {
        muted: next,
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === activeConversation.conversation_id ? { ...c, notifications_muted: next } : c
        )
      );
    } catch {
      void themedAlert(t('messagesPage.notifUpdateFailed'));
    } finally {
      setNotifToggling(false);
    }
  };

  const closeInfoPanel = () => {
    setShowInfoPanel(false);
    setInfoSubPanel('main');
  };

  /** Space modu: Tailwind v4'te `space:` eklentisi build'e girmeyebiliyor; isSpace ile kesin uygula */
  const messagesShellBorderBg = isSpace
    ? 'border-white/10 bg-[radial-gradient(circle_at_20%_0%,_rgba(99,102,241,0.15),_transparent_40%),linear-gradient(180deg,_#060618_0%,_#0a0a1a_50%,_#0c0c22_100%)]'
    : 'border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,_#fcfcff_0%,_#f5f7fb_48%,_#eef2ff_100%)]';
  const messagesInboxColumnClass = isSpace
    ? 'border-white/10 bg-[#0a0a1a]/90'
    : 'border-slate-200/80 bg-white/80';
  const messagesChatColumnClass = isSpace
    ? 'border-white/10 bg-[#0a0a1a]/90'
    : 'border-slate-200/80 bg-white/88';
  const messagesThreadScrollClass = isSpace
    ? 'bg-[linear-gradient(180deg,rgba(5,5,15,0.95)_0%,rgba(8,8,20,0.98)_100%)]'
    : 'bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,0.95)_100%)]';
  const messagesComposerBarClass = isSpace
    ? 'border-white/10 bg-[#08081a]/95'
    : 'border-slate-200/80 bg-white/92';
  const messagesInfoAsideClass = isSpace
    ? 'border-white/10 bg-[#0a0a1a]/95'
    : 'border-slate-200/80 bg-white/95';
  const messagesMobileInfoDrawerClass = isSpace
    ? 'border-white/10 bg-[#0a0a1a]/98'
    : 'border-slate-200/80 bg-white/95';

  const infoPanelContent = (onClose: () => void) => (
    <>
      {infoSubPanel === 'main' ? (
        <div className="border-b border-slate-200/80 space:border-white/10 px-4 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 space:text-slate-500">
              {t('messagesPage.conversationInfo')}
            </div>            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 space:bg-white/10 text-slate-500 space:text-slate-300 transition hover:bg-slate-200 space:hover:bg-white/15"
              title={t('common.close')}
            >
              <FiX size={16} />
            </button>
          </div>
          {activeConversation && activeHeaderAvatar ? (
            <>
              {(() => {
                const infoPeerId = getDmPeerUserId(activeConversation);
                const titleBlock = (
                  <>
                    <div className="mt-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[28px] bg-slate-950 text-lg font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
                      {(() => {
                        const src = mediaImageSrc(activeHeaderAvatar.url);
                        return src ? (
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        ) : (
                          getInitials(activeHeaderAvatar.label)
                        );
                      })()}
                    </div>
                    <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950 space:text-white">
                      {conversationTitle(activeConversation)}
                    </h3>
                  </>
                );
                if (infoPeerId != null) {
                  return (
                    <Link
                      to={`/profile/${infoPeerId}`}
                      className="mt-0 block text-left no-underline outline-none transition hover:opacity-90"
                      onClick={onClose}
                    >
                      {titleBlock}
                    </Link>
                  );
                }
                return titleBlock;
              })()}
              <p className="mt-2 text-sm leading-6 text-slate-500 space:text-slate-400">
                {activeConversation.is_group
                  ? t('messagesPage.groupPanelHintShort')
                  : t('messagesPage.directPanelHintShort')}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500 space:text-slate-400">{t('messagesPage.infoPanelEmpty')}</p>
          )}
        </div>
      ) : (
        <div className="border-b border-slate-200/80 space:border-white/10 px-4 pb-4 pt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setInfoSubPanel('main')}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 space:bg-white/10 text-slate-600 space:text-slate-300 transition hover:bg-slate-200 space:hover:bg-white/15"
                title={t('messagesPage.backToDetails')}
                aria-label={t('messagesPage.backToDetails')}
              >
                <FiArrowLeft size={18} />
              </button>
              <div className="min-w-0 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                {infoSubPanel === 'search' ? t('messagesPage.inChatSearchTitle') : t('messagesPage.sharedContentTitle')}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 space:bg-white/10 text-slate-500 space:text-slate-300 transition hover:bg-slate-200 space:hover:bg-white/15"
              title={t('common.close')}
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {infoSubPanel === 'main' && activeConversation && (
          <div>
            <p className="mb-2 px-0.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {t('messagesPage.inThisChat')}
            </p>
            <div className="overflow-hidden rounded-2xl border border-slate-200 space:border-white/10 bg-white space:bg-slate-800/50 shadow-sm">
              <button
                type="button"
                onClick={() => setInfoSubPanel('media')}
                className="flex w-full items-center gap-3 border-b border-slate-100 space:border-white/10 px-4 py-3.5 text-left text-slate-500 space:text-slate-400 transition hover:bg-slate-50 space:hover:bg-white/5"
              >
                <FiImage className="shrink-0" size={20} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 space:text-slate-100">{t('messagesPage.infoRowMedia')}</div>
                  <div className="text-xs text-slate-500 space:text-slate-400">{t('messagesPage.infoRowMediaSub')}</div>
                </div>
                <FiArrowRight className="shrink-0 text-slate-300" size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setInfoSubPanel('search')}
                className="flex w-full items-center gap-3 border-b border-slate-100 space:border-white/10 px-4 py-3.5 text-left text-slate-500 space:text-slate-400 transition hover:bg-slate-50 space:hover:bg-white/5"
              >
                <FiSearch className="shrink-0" size={20} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 space:text-slate-100">{t('messagesPage.infoRowSearch')}</div>
                  <div className="text-xs text-slate-500 space:text-slate-400">{t('messagesPage.infoRowSearchSub')}</div>
                </div>
                <FiArrowRight className="shrink-0 text-slate-300" size={16} aria-hidden />
              </button>
              <div className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-slate-500 space:text-slate-400">
                <FiBell className="shrink-0" size={20} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 space:text-slate-100">{t('messagesPage.infoRowNotif')}</div>
                  <div className="text-xs text-slate-500 space:text-slate-400">{t('messagesPage.infoRowNotifSub')}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!activeConversation.notifications_muted}
                  disabled={notifToggling}
                  onClick={() => void toggleNotificationsMuted()}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    activeConversation.notifications_muted ? 'bg-slate-400' : 'bg-indigo-500'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      activeConversation.notifications_muted ? 'left-0.5' : 'right-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {infoSubPanel === 'search' && activeConversation && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 space:border-white/10 bg-slate-50 space:bg-white/5 px-3 py-2.5">
              <FiSearch className="shrink-0 text-slate-400 space:text-slate-500" size={16} />
              <input
                value={inChatSearchQ}
                onChange={(e) => setInChatSearchQ(e.target.value)}
                placeholder={t('messagesPage.inChatSearchPlaceholder')}
                className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 space:text-slate-100 placeholder:text-slate-400 space:placeholder:text-slate-500 focus:outline-none"
              />
            </label>
            {inChatSearchLoading && inChatSearchQ.trim().length > 0 && (
              <p className="px-1 text-xs text-slate-400">{t('messagesPage.inChatSearchLoading')}</p>
            )}
            {!inChatSearchLoading && inChatSearchQ.trim().length > 0 && inChatSearchResults.length === 0 && (
              <p className="px-1 text-sm text-slate-500">{t('messagesPage.inChatSearchNoResults')}</p>
            )}
            <div className="space-y-1.5">
              {inChatSearchResults.map((m) => {
                const body = m.content || (m.attachments?.length ? t('messagesPage.attachmentMessageFallback') : '…');
                const short = body.length > 120 ? `${body.slice(0, 117)}…` : body;
                return (
                  <button
                    type="button"
                    key={m.message_id}
                    onClick={() => void goToMessageFromSearch(m.message_id)}
                    className="w-full rounded-2xl border border-slate-200 space:border-white/10 bg-white space:bg-slate-800/80 px-3 py-2.5 text-left text-slate-800 space:text-slate-100 shadow-sm transition hover:border-indigo-200 space:hover:border-indigo-500/40"
                  >
                    <div className="line-clamp-2 text-sm">{short}</div>
                    <div className="mt-1.5 text-[11px] text-slate-400">
                      {new Date(m.created_at).toLocaleString([], {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {infoSubPanel === 'media' && activeConversation && (
          <div className="space-y-5">
            {sharedLoading && (
              <p className="px-0.5 text-sm text-slate-500">{t('messagesPage.sharedLoading')}</p>
            )}
            {!sharedLoading && sharedAttachments.length === 0 && sharedLinks.length === 0 && (
              <p className="px-0.5 text-sm text-slate-500">{t('messagesPage.sharedEmpty')}</p>
            )}
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {t('messagesPage.sharedSectionMedia')}
              </p>
              {sharedAttachments.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sharedAttachments.map((a) => {
                    const attSrc = mediaImageSrc(a.file_url);
                    if (!attSrc) return null;
                    return (
                      <button
                        type="button"
                        key={a.attachment_id}
                        onClick={() => openSharedInViewer(a.file_url)}
                        className="overflow-hidden rounded-2xl border border-slate-200 space:border-white/10 bg-slate-100 space:bg-slate-800"
                      >
                        <img src={attSrc} alt="" className="h-28 w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                !sharedLoading && <p className="text-sm text-slate-500">{t('messagesPage.sharedNoMedia')}</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {t('messagesPage.sharedSectionLinks')}
              </p>
              {sharedLinks.length > 0 ? (
                <div className="space-y-1.5">
                  {sharedLinks.map((row, i) => (
                    <a
                      key={`${row.url}-${row.message_id}-${i}`}
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 space:border-white/10 bg-white space:bg-slate-800/80 px-3 py-2.5 text-left text-sm text-indigo-600 space:text-indigo-300 transition hover:border-indigo-200 space:hover:border-indigo-500/40"
                    >
                      <FiLink className="shrink-0" size={16} />
                      <span className="min-w-0 flex-1 truncate">{row.url}</span>
                      <FiExternalLink className="shrink-0 text-slate-400" size={14} />
                    </a>
                  ))}
                </div>
              ) : (
                !sharedLoading && <p className="text-sm text-slate-500">{t('messagesPage.sharedNoLinks')}</p>
              )}
            </div>
          </div>
        )}

        {infoSubPanel === 'main' && activeConversation && (
          <div className="rounded-[24px] border border-slate-200 space:border-white/10 bg-slate-50 space:bg-white/5 p-4">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 space:text-slate-500">
              {t('messagesPage.members')}
            </div>
            <div className="space-y-2">
              {membersForInfoList.map((member) => {
                const isYou = user != null && member.user_id === user.userId;
                const label = getDisplayName(
                  member.first_name,
                  member.last_name,
                  member.email || t('messagesPage.user')
                );
                const avatarFromMember = member.avatar_url ? mediaImageSrc(member.avatar_url) : '';
                const avatarSrc = isYou
                  ? avatarFromMember || getAuthUserAvatarUrl(user)
                  : avatarFromMember;
                const profileTo = isYou ? '/profile' : `/profile/${member.user_id}`;
                return (
                  <Link
                    key={member.user_id}
                    to={profileTo}
                    className="flex items-center gap-3 rounded-2xl bg-white space:bg-slate-800/60 px-3 py-2.5 no-underline transition hover:bg-slate-50/80 space:hover:bg-slate-700/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-xs font-black text-white">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                      ) : isYou ? (
                        <span className="text-[10px]">{getAuthUserInitials(user)}</span>
                      ) : (
                        getInitials(label)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="truncate text-sm font-bold text-slate-950 space:text-white">{label}</span>
                        {isYou && (
                          <span className="shrink-0 rounded-full bg-indigo-100 space:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-800 space:text-indigo-200">
                            {t('messagesPage.youBadge')}
                          </span>
                        )}
                      </div>
                      {member.email ? (
                        <div className="truncate text-xs text-slate-400 space:text-slate-500">{member.email}</div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="universe-messages box-border flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-1.5 sm:p-2 md:px-2.5 md:py-2 lg:px-3 lg:py-2.5">
      <div
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:rounded-[24px] md:rounded-[28px] lg:rounded-[30px] ${messagesShellBorderBg}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] ${isSpace ? 'opacity-15' : 'opacity-40'}`}
        />
        {showInfoPanel && (
          <button
            type="button"
            className="max-2xl:fixed max-2xl:inset-0 max-2xl:z-[90] max-2xl:cursor-default max-2xl:border-0 max-2xl:bg-slate-900/50 2xl:hidden"
            onClick={closeInfoPanel}
            aria-label={t('common.close')}
          />
        )}
        <div
          className={`relative z-0 grid min-h-0 h-full max-h-full min-w-0 grid-cols-1 gap-2 p-2 sm:gap-3 sm:p-3 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] ${showInfoPanel ? '2xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_260px]' : ''}`}
        >
          <aside
            className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[20px] border shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:rounded-[24px] lg:rounded-[28px] ${messagesInboxColumnClass} ${mobilePane === 'chat' ? 'hidden lg:flex' : 'flex'}`}
          >
            <div className="border-b border-slate-200/80 space:border-white/10 px-4 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`text-xs font-black uppercase tracking-[0.24em] ${isSpace ? 'text-indigo-300' : 'text-indigo-500'}`}
                  >
                    {t('messagesPage.inboxLabel')}
                  </div>
                  <h1 className={`mt-2 text-2xl font-black tracking-tight ${isSpace ? 'text-white' : 'text-slate-950'}`}>
                    {t('messagesPage.title')}
                  </h1>
                </div>
                <div
                  className={`rounded-2xl border px-3 py-2 text-right ${isSpace ? 'border-white/10 bg-white/[0.06]' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isSpace ? 'text-slate-400' : 'text-slate-400'}`}
                  >
                    {t('messagesPage.conversation')}
                  </div>
                  <div className={`mt-1 text-lg font-black ${isSpace ? 'text-white' : 'text-slate-950'}`}>
                    {conversations.length}
                  </div>
                </div>
              </div>

              <label
                className={`mt-4 flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${isSpace ? 'border-white/10 bg-white/[0.06]' : 'border-slate-200 bg-slate-50'}`}
              >
                <FiSearch className={`shrink-0 ${isSpace ? 'text-slate-400' : 'text-slate-400'}`} size={16} />
                <input
                  value={conversationQuery}
                  onChange={(event) => setConversationQuery(event.target.value)}
                  placeholder={t('messagesPage.searchConversations')}
                  className={`w-full border-0 bg-transparent p-0 text-sm placeholder:opacity-70 focus:outline-none focus:ring-0 ${isSpace ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
                />
              </label>
            </div>

            {showNewChatPanel ? (
              <div
                className={`border-b px-4 py-4 ${isSpace ? 'border-white/10' : 'border-slate-200/80'}`}
              >
                <div
                  className={`rounded-[26px] p-3.5 ${
                    isSpace
                      ? 'bg-slate-950 text-white shadow-[0_20px_50px_rgba(15,23,42,0.28)]'
                      : 'border border-slate-200/90 bg-white text-slate-900 shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] ${
                          isSpace ? 'text-white/55' : 'text-slate-500'
                        }`}
                      >
                        <FiUsers size={14} />
                        {t('messagesPage.newConversationTitle')}
                      </div>
                      <p
                        className={`mt-2 text-[13px] leading-6 ${
                          isSpace ? 'text-white/75' : 'text-slate-600'
                        }`}
                      >
                        {t('messagesPage.newConversationHint')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewChatPanel(false)}
                      className={
                        isSpace
                          ? 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-white/70 transition hover:bg-white/12 hover:text-white'
                          : 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200'
                      }
                      title={t('messagesPage.hidePanelForever')}
                    >
                      <FiX size={16} />
                    </button>
                  </div>

                  <label
                    className={`mt-4 flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
                      isSpace
                        ? 'border-white/10 bg-white/5'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <FiSearch
                      className={`shrink-0 ${isSpace ? 'text-white/45' : 'text-slate-400'}`}
                      size={16}
                    />
                    <input
                      value={searchText}
                      onChange={(event) => handleSearch(event.target.value).catch(() => {})}
                      placeholder={t('messagesPage.searchUsers')}
                      className={`w-full border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0 ${
                        isSpace
                          ? 'text-white placeholder:text-white/45'
                          : 'text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setNewGroup(false)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        !newGroup
                          ? isSpace
                            ? 'bg-white text-slate-950'
                            : 'bg-slate-900 text-white shadow-sm'
                          : isSpace
                            ? 'bg-white/8 text-white/70 hover:bg-white/12'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t('messagesPage.directMessage')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGroup(true)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        newGroup
                          ? isSpace
                            ? 'bg-white text-slate-950'
                            : 'bg-slate-900 text-white shadow-sm'
                          : isSpace
                            ? 'bg-white/8 text-white/70 hover:bg-white/12'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t('messagesPage.groupChat')}
                    </button>
                  </div>

                  {newGroup && (
                    <input
                      value={groupTitle}
                      onChange={(event) => setGroupTitle(event.target.value)}
                      placeholder={t('messagesPage.groupTitle')}
                      className={`mt-3 w-full rounded-2xl border px-3.5 py-3 text-sm focus:outline-none ${
                        isSpace
                          ? 'border-white/10 bg-white/5 text-white placeholder:text-white/45'
                          : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  )}

                  {selectedUserRows.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedUserRows.map((row) => (
                        <button
                          key={row.user_id}
                          type="button"
                          onClick={() => setSelectedUsers((prev) => prev.filter((id) => id !== row.user_id))}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            isSpace
                              ? 'border-white/12 bg-white/8 text-white'
                              : 'border-slate-200 bg-slate-100 text-slate-800'
                          }`}
                        >
                          {getDisplayName(row.first_name, row.last_name, row.email || t('messagesPage.user'))}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 max-h-36 space-y-2 overflow-auto pr-1">
                    {searchResults.map((row) => {
                      const checked = selectedUsers.includes(row.user_id);
                      const label = getDisplayName(row.first_name, row.last_name, row.email || t('messagesPage.user'));
                      return (
                        <button
                          key={row.user_id}
                          type="button"
                          onClick={() =>
                            setSelectedUsers((prev) =>
                              checked ? prev.filter((id) => id !== row.user_id) : [...prev, row.user_id]
                            )
                          }
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                            isSpace
                              ? checked
                                ? 'border-white/30 bg-white/12'
                                : 'border-white/8 bg-white/5 hover:border-white/16 hover:bg-white/8'
                              : checked
                                ? 'border-indigo-200 bg-indigo-50/80'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl text-xs font-black ${
                              isSpace
                                ? 'bg-white/10 text-white'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {(() => {
                              const u = mediaImageSrc(row.avatar_url);
                              return u ? (
                                <img src={u} alt="" className="h-full w-full object-cover" />
                              ) : (
                                getInitials(label)
                              );
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`truncate text-sm font-bold ${isSpace ? 'text-white' : 'text-slate-900'}`}
                            >
                              {label}
                            </div>
                            <div
                              className={`truncate text-xs ${
                                isSpace ? 'text-white/55' : 'text-slate-500'
                              }`}
                            >
                              {row.email}
                            </div>
                          </div>
                          {checked && (
                            <FiCheck
                              className={isSpace ? 'shrink-0 text-emerald-300' : 'shrink-0 text-emerald-600'}
                              size={16}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => createConversation().catch(() => {})}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-400"
                  >
                    {t('messagesPage.startChat')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-b border-slate-200/80 space:border-white/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setShowNewChatPanel(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 space:border-white/20 bg-slate-50 space:bg-white/5 px-4 py-3 text-sm font-bold text-slate-700 space:text-slate-200 transition hover:bg-slate-100 space:hover:bg-white/10"
                >
                  <FiPlus size={16} />
                  {t('messagesPage.showNewChatPanel')}
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="mb-3 flex items-center justify-between px-1">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 space:text-slate-500">
                  {t('messagesPage.recentChats')}
                </div>
                <div className="text-xs font-semibold text-slate-500 space:text-slate-400">
                  {filteredConversations.length} {t('messagesPage.resultsLabel')}
                </div>
              </div>

              {loadingConversations ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-[24px] border border-slate-100 space:border-white/5 bg-white space:bg-slate-800/40 px-3 py-3"
                    >
                      <div className="flex items-start gap-3 animate-pulse">
                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-200" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-4 w-1/2 rounded-full bg-slate-200" />
                          <div className="h-3 w-4/5 rounded-full bg-slate-100" />
                          <div className="h-3 w-1/3 rounded-full bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 space:border-white/15 bg-slate-50 space:bg-white/5 px-4 py-8 text-center text-sm font-semibold text-slate-500 space:text-slate-400">
                  {t('messagesPage.noConversationsFound')}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => {
                    const avatar = conversationAvatar(conversation);
                    const listAvatarSrc = mediaImageSrc(avatar.url);
                    const unreadCount = Number(conversation.unread_count) || 0;
                    const title = conversationTitle(conversation);
                    const listPeerId = getDmPeerUserId(conversation);
                    const isRowActive = conversation.conversation_id === activeConversationId;
                    return (
                      <div
                        key={conversation.conversation_id}
                        className={`group flex w-full items-stretch gap-1 rounded-[24px] border transition ${
                          isRowActive
                            ? isSpace
                              ? 'border border-indigo-500/50 bg-indigo-950/55 shadow-[0_12px_30px_rgba(99,102,241,0.2)]'
                              : 'border border-indigo-200 bg-indigo-50/90 shadow-[0_12px_30px_rgba(99,102,241,0.16)]'
                            : isSpace
                              ? 'border-transparent bg-slate-800/50 hover:border-white/10 hover:bg-slate-800/80'
                              : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveConversationId(conversation.conversation_id);
                            setMobilePane('chat');
                          }}
                          className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left"
                        >
                          <div className="relative shrink-0">
                            {listPeerId != null ? (
                              <Link
                                to={`/profile/${listPeerId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block"
                                aria-label={title}
                              >
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-sm font-black text-white">
                                  {listAvatarSrc ? (
                                    <img
                                      src={listAvatarSrc}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    getInitials(avatar.label)
                                  )}
                                </div>
                              </Link>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-sm font-black text-white">
                                {listAvatarSrc ? (
                                  <img
                                    src={listAvatarSrc}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  getInitials(avatar.label)
                                )}
                              </div>
                            )}
                            <NavIconBadge count={unreadCount} tone="messages" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              {listPeerId != null ? (
                                <Link
                                  to={`/profile/${listPeerId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`min-w-0 flex-1 truncate text-left text-sm font-black no-underline transition hover:underline ${
                                    isRowActive
                                      ? isSpace
                                        ? 'text-white'
                                        : 'text-slate-900'
                                      : 'text-slate-950'
                                  }`}
                                >
                                  {title}
                                </Link>
                              ) : (
                                <div
                                  className={`truncate text-sm font-black ${
                                    isRowActive
                                      ? isSpace
                                        ? 'text-white'
                                        : 'text-slate-900'
                                      : 'text-slate-950'
                                  }`}
                                >
                                  {title}
                                </div>
                              )}
                              <div
                                className={`shrink-0 text-[11px] font-medium ${
                                  isRowActive
                                    ? isSpace
                                      ? 'text-indigo-200/90'
                                      : 'text-slate-500'
                                    : isSpace
                                      ? 'text-slate-400'
                                      : 'text-slate-400'
                                }`}
                              >
                                {formatRelativeTimestamp(conversation.last_message_created_at)}
                              </div>
                            </div>
                            <div
                              className={`mt-1 truncate text-sm ${
                                isRowActive
                                  ? isSpace
                                    ? 'text-slate-300'
                                    : 'text-slate-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {conversation.last_message_content || t('messagesPage.noMessagesYet')}
                            </div>
                            <div
                              className={`mt-2 flex items-center gap-2 text-[11px] font-semibold ${
                                isRowActive
                                  ? isSpace
                                    ? 'text-slate-400'
                                    : 'text-slate-500'
                                  : isSpace
                                    ? 'text-slate-400'
                                    : 'text-slate-500'
                              }`}
                            >
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                                  unreadCount > 0
                                    ? isRowActive
                                      ? isSpace
                                        ? 'bg-indigo-900/70 text-indigo-100'
                                        : 'bg-indigo-100 text-indigo-800'
                                      : isSpace
                                        ? 'bg-indigo-950/60 text-indigo-200'
                                        : 'bg-indigo-100 text-indigo-700'
                                    : isRowActive
                                      ? isSpace
                                        ? 'bg-white/10 text-slate-300'
                                        : 'bg-slate-200/80 text-slate-600'
                                      : isSpace
                                        ? 'bg-slate-800 text-slate-400'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    unreadCount > 0
                                      ? isSpace
                                        ? 'bg-indigo-300'
                                        : 'bg-indigo-500'
                                      : isSpace
                                        ? 'bg-slate-500'
                                        : 'bg-slate-400'
                                  }`}
                                />
                                {unreadCount > 0 ? t('messagesPage.newMessages') : t('messagesPage.upToDate')}
                              </span>
                              <span
                                className={`truncate ${
                                  isRowActive
                                    ? isSpace
                                      ? 'text-slate-400'
                                      : 'text-slate-500'
                                    : 'text-slate-500'
                                }`}
                              >
                                {conversation.is_group
                                  ? `${dedupeConversationMembers(conversation.members).length} ${t('messagesPage.participants')}`
                                  : t('messagesPage.directMessage')}
                              </span>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          title={t('messagesPage.deleteChat')}
                          onClick={(event) => deleteConversation(conversation, event)}
                          className="mx-1 my-1 inline-flex w-11 items-center justify-center rounded-[20px] text-slate-400 space:text-slate-500 opacity-0 transition hover:bg-red-50 space:hover:bg-red-950/30 hover:text-red-600 space:hover:text-red-300 group-hover:opacity-100"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section
            className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[20px] border shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:rounded-[24px] lg:rounded-[28px] ${messagesChatColumnClass} ${mobilePane === 'list' ? 'hidden lg:flex' : 'flex'}`}
          >
            <div className="border-b border-slate-200/80 space:border-white/10 px-4 py-4">
              {error && (
                <div className="mb-3 rounded-2xl border border-red-200 space:border-red-500/30 bg-red-50 space:bg-red-950/30 px-3.5 py-3 text-sm font-semibold text-red-600 space:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobilePane('list')}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 space:border-white/10 bg-white space:bg-slate-800/80 text-slate-500 space:text-slate-300 lg:hidden"
                >
                  <FiArrowLeft size={18} />
                </button>

                {activeConversation && activeHeaderAvatar ? (
                  <>
                    {(() => {
                      const headerPeerId = getDmPeerUserId(activeConversation);
                      const av = (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-sm font-black text-white">
                          {(() => {
                            const src = mediaImageSrc(activeHeaderAvatar.url);
                            return src ? (
                              <img src={src} alt="" className="h-full w-full object-cover" />
                            ) : (
                              getInitials(activeHeaderAvatar.label)
                            );
                          })()}
                        </div>
                      );
                      return (
                        <>
                          {headerPeerId != null ? (
                            <Link
                              to={`/profile/${headerPeerId}`}
                              className="shrink-0 no-underline outline-none transition hover:opacity-90"
                              title={conversationTitle(activeConversation)}
                            >
                              {av}
                            </Link>
                          ) : (
                            av
                          )}
                          <div className="min-w-0 flex-1">
                            {headerPeerId != null ? (
                              <Link
                                to={`/profile/${headerPeerId}`}
                                className="block truncate text-lg font-black text-slate-950 no-underline space:text-white transition hover:underline"
                              >
                                {conversationTitle(activeConversation)}
                              </Link>
                            ) : (
                              <div className="truncate text-lg font-black text-slate-950 space:text-white">
                                {conversationTitle(activeConversation)}
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 space:text-slate-400">
                              <span className="rounded-full bg-emerald-50 space:bg-emerald-950/50 px-2.5 py-1 text-emerald-600 space:text-emerald-300">
                                {activeConversation.is_group
                                  ? `${groupTotalMemberCount} ${t('messagesPage.participants')}`
                                  : t('messagesPage.activeNow')}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                    <button
                      type="button"
                      title={t('messagesPage.showInfoPanel')}
                      aria-expanded={showInfoPanel}
                      aria-label={t('messagesPage.showInfoPanel')}
                      onClick={() => setShowInfoPanel((open) => !open)}
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
                        showInfoPanel
                          ? 'border-indigo-200 space:border-indigo-500/50 bg-indigo-50 space:bg-indigo-950/50 text-indigo-600 space:text-indigo-300'
                          : 'border-slate-200 space:border-white/10 bg-white space:bg-slate-800/80 text-slate-500 space:text-slate-300 hover:border-slate-300 space:hover:border-white/15 hover:bg-slate-50 space:hover:bg-slate-800'
                      }`}
                    >
                      <FiInfo size={18} />
                    </button>
                    <button
                      type="button"
                      title={t('messagesPage.deleteChat')}
                      onClick={() => deleteActiveConversation().catch(() => {})}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 space:border-white/10 bg-white space:bg-slate-800/80 text-slate-500 space:text-slate-300 transition hover:border-red-200 space:hover:border-red-500/40 hover:bg-red-50 space:hover:bg-red-950/30 hover:text-red-600 space:hover:text-red-300"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[24px] border border-dashed border-slate-200 space:border-white/15 bg-slate-50 space:bg-white/5 px-4 py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <FiMessageSquare size={20} />
                    </div>
                    <div>
                      <div className="text-base font-black text-slate-950 space:text-white">
                        {t('messagesPage.selectConversation')}
                      </div>
                      <div className="mt-1 text-sm text-slate-500 space:text-slate-400">{t('messagesPage.pickConversationHint')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 ${messagesThreadScrollClass}`}>
              {!activeConversationId ? (
                <div className="flex min-h-full flex-col items-center justify-center px-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
                    <FiMessageSquare size={26} />
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 space:text-white">
                    {t('messagesPage.noConversationTitle')}
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 space:text-slate-400">
                    {t('messagesPage.noConversationDescription')}
                  </p>
                </div>
              ) : loadingMessages ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] animate-pulse rounded-[26px] px-4 py-3 ${index % 2 === 0 ? 'bg-white space:bg-slate-800 border border-slate-200 space:border-slate-600' : 'bg-slate-200 space:bg-slate-700'}`}>
                        <div className="h-3 w-20 rounded-full bg-slate-200/80" />
                        <div className="mt-2 h-4 w-48 rounded-full bg-slate-200/80" />
                        <div className="mt-2 h-4 w-32 rounded-full bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const mine = !!user && message.sender_user_id === user.userId;
                    const readLabel = getReadLabel(message.message_id, message.sender_user_id);
                    const canUnsend = mine && !isMessageReadByOthers(message.message_id);
                    const showDayDivider =
                      index === 0 ||
                      new Date(messages[index - 1].created_at).toDateString() !==
                        new Date(message.created_at).toDateString();
                    const senderName = getDisplayName(
                      message.sender_first_name,
                      message.sender_last_name,
                      t('messagesPage.user')
                    );
                    const avatarLabel = getInitials(senderName);

                    return (
                      <React.Fragment key={message.message_id}>
                        {showDayDivider && (
                          <div className="flex items-center justify-center py-2">
                            <span className="rounded-full border border-slate-200 space:border-slate-600/50 bg-white space:bg-slate-800/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 space:text-slate-500">
                              {formatDayLabel(message.created_at)}
                            </span>
                          </div>
                        )}

                        <div className={`flex gap-3 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && (
                            <Link
                              to={`/profile/${message.sender_user_id}`}
                              className="hidden self-end sm:block no-underline outline-none transition hover:opacity-90"
                              title={senderName}
                            >
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-xs font-black text-white">
                                {(() => {
                                  const s = mediaImageSrc(message.sender_avatar_url);
                                  return s ? (
                                    <img src={s} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    avatarLabel
                                  );
                                })()}
                              </div>
                            </Link>
                          )}

                          <div className={`max-w-[88%] sm:max-w-[72%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                            {!mine && activeConversation?.is_group && (
                              <Link
                                to={`/profile/${message.sender_user_id}`}
                                className="mb-1 block px-1 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 no-underline space:text-slate-500 transition hover:text-slate-600 space:hover:text-slate-300"
                              >
                                {senderName}
                              </Link>
                            )}

                            <div
                              data-message-id={message.message_id}
                              className={`relative overflow-hidden rounded-[26px] border px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.07)] ${
                                mine
                                  ? 'border-indigo-200 bg-[linear-gradient(135deg,_#312e81_0%,_#4338ca_58%,_#818cf8_100%)] text-white'
                                  : 'border-slate-200 space:border-slate-600/40 bg-white space:bg-slate-800/90 text-slate-900 space:text-slate-100'
                              } ${
                                highlightMessageId === message.message_id
                                  ? 'ring-2 ring-amber-400 ring-offset-2 space:ring-offset-slate-900'
                                  : ''
                              }`}
                            >
                              {message.content && (
                                <p className={`whitespace-pre-wrap text-sm leading-6 ${mine ? 'text-white' : 'text-slate-700 space:text-slate-200'}`}>
                                  {message.content}
                                </p>
                              )}

                              {!!message.attachments?.length && (
                                <div className={`mt-3 grid grid-cols-2 gap-2 ${message.attachments.length === 1 ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
                                  {message.attachments.map((attachment) => {
                                    const att = mediaImageSrc(attachment.file_url);
                                    if (!att) return null;
                                    return (
                                      <button
                                        key={attachment.attachment_id}
                                        type="button"
                                        onClick={() => openMediaViewer(att)}
                                        className="group block overflow-hidden rounded-2xl border border-black/5 text-left"
                                      >
                                        <img
                                          src={att}
                                          alt="attachment"
                                          className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              <div className={`mt-3 flex items-center justify-between gap-3 text-[11px] font-semibold ${mine ? 'text-white/75' : 'text-slate-400 space:text-slate-500'}`}>
                                <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="flex items-center gap-1.5">
                                  {readLabel && (
                                    <span className={`font-bold ${mine ? 'text-white' : 'text-indigo-500 space:text-indigo-300'}`}>
                                      {readLabel}
                                    </span>
                                  )}
                                  {mine && (
                                    <div className="relative" data-message-menu-root>
                                      <button
                                        type="button"
                                        aria-expanded={messageMenuOpenId === message.message_id}
                                        aria-haspopup="menu"
                                        aria-label={t('messagesPage.messageActionsMenu')}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setMessageMenuOpenId((openId) =>
                                            openId === message.message_id ? null : message.message_id
                                          );
                                        }}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/10 text-current transition hover:bg-black/15"
                                      >
                                        <FiMoreHorizontal size={15} />
                                      </button>
                                      {messageMenuOpenId === message.message_id && (
                                        <div
                                          role="menu"
                                          className="absolute right-0 top-full z-30 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border border-slate-200 space:border-white/10 bg-white space:bg-slate-900 py-1 text-slate-900 space:text-slate-100 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                                        >
                                          <button
                                            type="button"
                                            role="menuitem"
                                            disabled={!canUnsend}
                                            title={canUnsend ? undefined : t('messagesPage.unsendDisabledRead')}
                                            onClick={() => {
                                              if (!canUnsend) return;
                                              unsendMessage(message.message_id, 'unsendConfirm').catch(() => {});
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 space:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            {t('messagesPage.menuUnsend')}
                                          </button>
                                          <button
                                            type="button"
                                            role="menuitem"
                                            disabled={!canUnsend}
                                            title={canUnsend ? undefined : t('messagesPage.unsendDisabledRead')}
                                            onClick={() => {
                                              if (!canUnsend) return;
                                              unsendMessage(message.message_id, 'deleteMessageConfirm').catch(() => {});
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 space:text-red-300 hover:bg-red-50 space:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
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
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
                </div>
              )}
            </div>

            {activeConversationId ? (
              <div className={`border-t px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 backdrop-blur ${messagesComposerBarClass}`}>
                {imagePreviews.length > 0 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {imagePreviews.map((preview) => (
                      <div
                        key={`${preview.file.name}-${preview.file.size}`}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 space:border-white/10 bg-slate-100 space:bg-slate-800"
                      >
                        <img src={preview.url} alt={preview.file.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedImage(preview.file.name)}
                          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-xs font-black text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 space:border-white/10 bg-slate-50 space:bg-slate-900/60 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <div className="flex items-end gap-3">
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white space:bg-slate-800 text-slate-500 space:text-slate-300 shadow-sm transition hover:text-indigo-600 space:hover:text-indigo-300"
                        title={t('messagesPage.attachPhoto')}
                      >
                        <FiImage size={18} />
                      </button>
                      <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white space:bg-slate-800 text-slate-400 space:text-slate-500 shadow-sm md:inline-flex">
                        <FiPaperclip size={18} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        rows={1}
                        placeholder={t('messagesPage.writeMessage')}
                        className="min-h-[84px] w-full resize-none rounded-[24px] border border-transparent space:border-white/10 bg-white space:bg-slate-800/90 px-4 py-3 text-sm leading-6 text-slate-900 space:text-slate-100 placeholder:text-slate-400 space:placeholder:text-slate-500 focus:border-indigo-200 space:focus:border-indigo-500/40 focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => sendMessage().catch(() => {})}
                      className="inline-flex h-14 shrink-0 items-center gap-2 rounded-[22px] bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <FiSend size={16} />
                      {sending ? t('messagesPage.sending') : t('messagesPage.send')}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-semibold text-slate-400 space:text-slate-500">
                    <span>{t('messagesPage.composerHint')}</span>
                    <span>
                      {images.length > 0
                        ? `${images.length} ${t('messagesPage.attachmentsSelected')}`
                        : t('messagesPage.attachmentsFeature')}
                    </span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setImages(Array.from(event.target.files || []))}
                  className="hidden"
                />
              </div>
            ) : null}
          </section>

          {showInfoPanel && (
            <aside
              className={`hidden h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[20px] border shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:rounded-[24px] lg:rounded-[28px] 2xl:flex ${messagesInfoAsideClass}`}
            >
              {infoPanelContent(closeInfoPanel)}
            </aside>
          )}
        </div>
        {showInfoPanel && (
          <aside
            className={`fixed right-0 top-0 z-[100] flex h-full w-full max-w-md flex-col overflow-hidden rounded-l-3xl border-l shadow-2xl backdrop-blur 2xl:hidden ${messagesMobileInfoDrawerClass}`}
          >
            {infoPanelContent(closeInfoPanel)}
          </aside>
        )}
        {mediaViewer && currentMediaUrl && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
            onClick={closeMediaViewer}
          >
            <div
              className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeMediaViewer}
                className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
                aria-label="Close image preview"
              >
                <FiX size={18} />
              </button>
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={zoomOut}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-40"
                  disabled={mediaZoom <= 1}
                  aria-label="Zoom out"
                >
                  <FiZoomOut size={18} />
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-40"
                  disabled={mediaZoom >= 3}
                  aria-label="Zoom in"
                >
                  <FiZoomIn size={18} />
                </button>
                <a
                  href={currentMediaUrl}
                  download
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
                  aria-label="Download image"
                >
                  <FiDownload size={18} />
                </a>
              </div>
              {mediaViewer.items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => stepMedia(-1)}
                    className="absolute left-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
                    aria-label="Previous image"
                  >
                    <FiArrowLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepMedia(1)}
                    className="absolute right-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
                    aria-label="Next image"
                  >
                    <FiArrowRight size={20} />
                  </button>
                </>
              )}
              <div className="flex max-h-[85vh] min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),_transparent_35%),#020617] p-4 md:p-8">
                <img
                  src={currentMediaUrl}
                  alt="Expanded attachment"
                  className="max-h-[75vh] w-auto max-w-full rounded-[20px] object-contain transition-transform duration-200"
                  style={{ transform: `scale(${mediaZoom})` }}
                />
              </div>
              <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                <div>{mediaViewer.index + 1} / {mediaViewer.items.length}</div>
                <div>%{Math.round(mediaZoom * 100)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
