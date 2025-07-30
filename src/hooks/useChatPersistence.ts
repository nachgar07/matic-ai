import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useChatPersistence = () => {
  useEffect(() => {
    // Clean up old conversations on component mount
    const cleanOldConversations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Delete conversations older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        await supabase
          .from('chat_conversations')
          .delete()
          .eq('user_id', user.id)
          .lt('created_at', sevenDaysAgo.toISOString());

        console.log('Old conversations cleaned up');
      } catch (error) {
        console.error('Error cleaning old conversations:', error);
      }
    };

    // Run cleanup on mount
    cleanOldConversations();

    // Set up periodic cleanup (every 24 hours)
    const intervalId = setInterval(cleanOldConversations, 24 * 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const clearAllConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      await supabase
        .from('chat_conversations')
        .delete()
        .eq('user_id', user.id);

      return true;
    } catch (error) {
      console.error('Error clearing all conversations:', error);
      return false;
    }
  };

  return { clearAllConversations };
};