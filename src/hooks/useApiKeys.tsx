import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export function useApiKeys() {
  const { user, session } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApiKeys = useCallback(async () => {
    if (!user) {
      setApiKeys([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_prefix, name, last_used_at, created_at, revoked_at')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys((data as ApiKey[]) || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const generateApiKey = async (name: string): Promise<{ api_key: string; id: string } | null> => {
    if (!session?.access_token) return null;

    try {
      const { data, error } = await supabase.functions.invoke('runner-auth', {
        body: { action: 'generate', name },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      await fetchApiKeys();
      return data;
    } catch (error) {
      console.error('Error generating API key:', error);
      throw error;
    }
  };

  const revokeApiKey = async (keyId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId);

      if (error) throw error;
      
      await fetchApiKeys();
      return true;
    } catch (error) {
      console.error('Error revoking API key:', error);
      return false;
    }
  };

  return {
    apiKeys,
    loading,
    generateApiKey,
    revokeApiKey,
    refetchApiKeys: fetchApiKeys,
  };
}
