// /hooks/useFeedbackComments.js
// ============================================================================
// Hook for managing feedback comments on post variations
// ============================================================================
// FIXED: Proper query syntax for resolve/unresolve operations
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Custom hook to manage feedback comments for a variation
 * @param {number} variationId - The ID of the post variation
 * @returns {Object} - { comments, loading, error, addComment, resolveComment, deleteComment, unresolveComment, reload }
 */
export function useFeedbackComments(variationId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // Load all comments for this variation
  // ============================================================================
  async function loadComments() {
    if (!variationId) {
      setComments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('variation_id', variationId)
        .order('created_at', { ascending: true }); // ✅ Oldest first

      if (fetchError) throw fetchError;

      setComments(data || []);
    } catch (err) {
      console.error('Error loading feedback comments:', err);
      setError(err.message);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // Load comments when variationId changes
  // ============================================================================
  useEffect(() => {
    loadComments();
  }, [variationId]);

  // ============================================================================
  // Add a new comment
  // ============================================================================
  async function addComment(commentText) {
    if (!variationId || !commentText?.trim()) {
      throw new Error('Comment text is required');
    }

    try {
      // Get current user's profile info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's profile name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Insert new comment
      const { data, error: insertError } = await supabase
        .from('feedback_comments')
        .insert([{
          variation_id: variationId,
          user_id: user.id,
          user_name: profile?.full_name || 'Unknown User',
          comment_text: commentText.trim(),
          resolved: false,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state (append to end since oldest-first)
      setComments(prev => [...prev, data]);

      return data;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  }

  // ============================================================================
  // Resolve a comment (mark as done)
  // ============================================================================
  async function resolveComment(commentId) {
    if (!commentId) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // ✅ FIXED: Remove .single() and use proper update
      const { error: updateError } = await supabase
        .from('feedback_comments')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', commentId);

      if (updateError) throw updateError;

      // Update local state
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { 
                ...comment, 
                resolved: true, 
                resolved_at: new Date().toISOString(), 
                resolved_by: user.id 
              }
            : comment
        )
      );
    } catch (err) {
      console.error('Error resolving comment:', err);
      throw err;
    }
  }

  // ============================================================================
  // Unresolve a comment (mark as still needing attention)
  // ============================================================================
  async function unresolveComment(commentId) {
    if (!commentId) return;

    try {
      // ✅ FIXED: Remove .single() and use proper update
      const { error: updateError } = await supabase
        .from('feedback_comments')
        .update({
          resolved: false,
          resolved_at: null,
          resolved_by: null
        })
        .eq('id', commentId);

      if (updateError) throw updateError;

      // Update local state
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, resolved: false, resolved_at: null, resolved_by: null }
            : comment
        )
      );
    } catch (err) {
      console.error('Error unresolving comment:', err);
      throw err;
    }
  }

  // ============================================================================
  // Delete a comment (only own comments)
  // ============================================================================
  async function deleteComment(commentId) {
    if (!commentId) return;

    try {
      const { error: deleteError } = await supabase
        .from('feedback_comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  }

  // ============================================================================
  // Helper: Count unresolved comments
  // ============================================================================
  const unresolvedCount = comments.filter(c => !c.resolved).length;

  // ============================================================================
  // Return hook interface
  // ============================================================================
  return {
    comments,              // Array of all comments for this variation
    loading,               // True while loading comments
    error,                 // Error message if load failed
    unresolvedCount,       // Count of unresolved comments
    addComment,            // Function to add new comment
    resolveComment,        // Function to mark comment as resolved
    unresolveComment,      // Function to mark comment as unresolved
    deleteComment,         // Function to delete comment
    reload: loadComments   // Function to manually reload comments
  };
}