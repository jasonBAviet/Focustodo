import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { VocabularyItem, SentenceItem } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { getApiBaseUrl } from '@/utils/capacitorConfig';

interface LearningContextType {
  vocabularyList: VocabularyItem[];
  sentencesList: SentenceItem[];
  loading: boolean;
  error: string | null;
  selectedItemId: string | null;
  selectedItemType: 'vocab' | 'sentence';
  setSelectedItemId: (id: string | null) => void;
  setSelectedItemType: (type: 'vocab' | 'sentence') => void;
  fetchLearningData: () => Promise<void>;
  markItemLearnedStatus: (itemId: string, itemType: 'vocab' | 'sentence', status: 'learned' | 'unlearned') => Promise<void>;
}

const LearningContext = createContext<LearningContextType | null>(null);

export const LearningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);
  const [sentencesList, setSentencesList] = useState<SentenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'vocab' | 'sentence'>('vocab');

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  const fetchLearningData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/learning`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Lỗi tải dữ liệu: ${res.statusText}`);
      }
      const data = await res.json();
      setVocabularyList(data.vocabulary || []);
      setSentencesList(data.sentences || []);
    } catch (err: any) {
      setError(err.message || 'Không thể lấy dữ liệu học tập.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const markItemLearnedStatus = useCallback(async (
    itemId: string,
    itemType: 'vocab' | 'sentence',
    status: 'learned' | 'unlearned'
  ) => {
    // 1. Optimistic update: cập nhật UI ngay lập tức
    if (itemType === 'vocab') {
      setVocabularyList((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status } : item))
      );
    } else {
      setSentencesList((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status } : item))
      );
    }

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/learning/mark`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ itemId, itemType, status }),
      });
      if (!res.ok) {
        throw new Error('Không thể cập nhật trạng thái trên server.');
      }
    } catch (err) {
      console.error(err);
      // Rollback nếu có lỗi xảy ra
      const originalStatus = status === 'learned' ? 'unlearned' : 'learned';
      if (itemType === 'vocab') {
        setVocabularyList((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, status: originalStatus } : item))
        );
      } else {
        setSentencesList((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, status: originalStatus } : item))
        );
      }
    }
  }, [getHeaders]);

  useEffect(() => {
    if (token) {
      fetchLearningData();
    }
  }, [token, fetchLearningData]);

  const value = useMemo(() => ({
    vocabularyList,
    sentencesList,
    loading,
    error,
    selectedItemId,
    selectedItemType,
    setSelectedItemId,
    setSelectedItemType,
    fetchLearningData,
    markItemLearnedStatus
  }), [
    vocabularyList,
    sentencesList,
    loading,
    error,
    selectedItemId,
    selectedItemType,
    fetchLearningData,
    markItemLearnedStatus
  ]);

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
};

export const useLearningContext = () => {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearningContext phải được sử dụng trong LearningProvider.');
  }
  return context;
};
