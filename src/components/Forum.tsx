import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ForumPost } from '../types';
import { 
  MessageSquare, Heart, Send, Sparkles, Filter, Star, Milestone, 
  BookOpen, Smile, UserPlus, Info, Check, CornerDownRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Forum: React.FC = () => {
  const { forumPosts, addForumPost, addForumReply, toggleLikePost, user, books } = useApp();
  const [filter, setFilter] = useState<'all' | 'review' | 'thought' | 'milestone'>('all');
  
  // New post state
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'review' | 'thought' | 'milestone'>('thought');
  const [postBookId, setPostBookId] = useState('');
  const [postRating, setPostRating] = useState<number>(5);

  // Quick reply state
  const [replyPostId, setReplyPostId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    // Resolve book title
    const selectedBook = books.find(b => b.id === postBookId);
    const bookTitle = selectedBook ? selectedBook.title : undefined;

    addForumPost(
      postContent,
      postType,
      postBookId ? postBookId : undefined,
      bookTitle,
      postType === 'review' ? postRating : undefined
    );

    // Reset composer
    setPostContent('');
    setPostBookId('');
    setPostType('thought');
  };

  const handleCreateReply = (postId: string) => {
    if (!replyContent.trim()) return;
    addForumReply(postId, replyContent);
    setReplyContent('');
    setReplyPostId(null);
  };

  const filteredPosts = forumPosts.filter(
    post => filter === 'all' || post.type === filter
  );

  return (
    <div className="space-y-6">
      {/* Forum Header description */}
      <div className="rounded-3xl border-4 border-brand-navy bg-brand-cream p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] flex flex-col md:flex-row gap-5 items-center justify-between">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-xl font-extrabold text-brand-navy flex items-center gap-1.5 justify-center md:justify-start">
            <Sparkles className="h-5 w-5 text-brand-clay" /> Library Reading Circle
          </h2>
          <p className="text-xs font-semibold text-brand-navy/60">Share reviews, milestone finishes, and reading logs with fellow bibliophiles.</p>
        </div>

        {/* Filters Tabs */}
        <div className="flex flex-wrap gap-1 bg-white border-2 border-brand-navy p-1 rounded-2xl">
          {[
            { key: 'all', label: 'All Activity' },
            { key: 'review', label: 'Reviews' },
            { key: 'thought', label: 'Thoughts' },
            { key: 'milestone', label: 'Milestones' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-1 text-[11px] font-bold rounded-xl transition-all ${
                filter === tab.key 
                  ? 'bg-brand-clay text-white shadow-sm' 
                  : 'text-brand-navy hover:bg-brand-paper'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Forum Composer (Bento Box) - LHS */}
        <div className="lg:col-span-5 rounded-3xl border-4 border-brand-navy bg-white p-5 shadow-[6px_6px_0px_0px_var(--color-brand-navy)] space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-brand-navy/60 flex items-center gap-1.5 pb-2 border-b border-brand-navy/10">
            <MessageSquare className="h-4.5 w-4.5 text-brand-clay" /> Circle Composer
          </h3>

          {!user ? (
            <div className="text-center py-6 bg-brand-paper/50 rounded-2xl border-2 border-dashed border-brand-navy/15 p-4 space-y-2">
              <Info className="h-6 w-6 text-brand-navy/30 mx-auto" />
              <p className="text-xs font-bold text-brand-navy">Google Authentication Required</p>
              <p className="text-[10px] text-brand-navy/50 font-medium">Please sign in with Google in the upper right header to compose or comment!</p>
            </div>
          ) : (
            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-brand-navy/50 mb-1.5">Post Type:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'thought', label: 'Thought' },
                    { key: 'review', label: 'Review' },
                    { key: 'milestone', label: 'Milestone' }
                  ].map((tp) => (
                    <button
                      type="button"
                      key={tp.key}
                      onClick={() => setPostType(tp.key as any)}
                      className={`py-1 text-xs font-bold rounded-xl border-2 border-brand-navy transition-all ${
                        postType === tp.key
                          ? 'bg-brand-clay text-white shadow-none'
                          : 'bg-white text-brand-navy shadow-[2px_2px_0px_0px_var(--color-brand-navy)]'
                      }`}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Book Association Dropdown */}
              {books.length > 0 && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-brand-navy/50 mb-1">Associate Book (Optional):</label>
                  <select
                    value={postBookId}
                    onChange={(e) => setPostBookId(e.target.value)}
                    className="w-full rounded-xl border-2 border-brand-navy bg-brand-paper/40 px-3 py-1.5 text-xs font-bold text-brand-navy outline-none"
                  >
                    <option value="">-- No Association --</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Star Rating for Reviews */}
              {postType === 'review' && (
                <div className="bg-brand-paper p-2 rounded-xl border border-brand-navy/20">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-brand-navy/50 mb-1">Your rating stars:</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setPostRating(star)}
                        className="hover:scale-125 transition-transform"
                      >
                        <Star className={`h-5 w-5 ${
                          star <= postRating ? 'fill-brand-sand text-brand-navy' : 'text-brand-navy/20'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-brand-navy/50 mb-1">What are you thinking/reading?</label>
                <textarea
                  required
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder={
                    postType === 'thought' ? 'E.g., "Just finished the most incredible chapter of..."' :
                    postType === 'review' ? 'Share your detailed summary rating and analysis...' :
                    'Celebrate a milestone (finished book, hit daily goal, etc.)'
                  }
                  rows={4}
                  className="w-full rounded-xl border-2 border-brand-navy bg-white p-2.5 text-xs font-medium text-brand-navy outline-none focus:bg-brand-cream"
                />
              </div>

              {/* Send Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_var(--color-brand-clay)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                id="post-submit-btn"
              >
                <Send className="h-4 w-4" /> Share with Circle
              </button>
            </form>
          )}
        </div>

        {/* Forum List Feed - RHS */}
        <div className="lg:col-span-7 space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 rounded-3xl border-4 border-dashed border-brand-navy/15 bg-brand-paper/40 p-4">
              <MessageSquare className="h-10 w-10 text-brand-navy/25 mx-auto mb-2" />
              <p className="text-xs font-bold text-brand-navy/50 uppercase">No active posts found in this circle category</p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isLiked = user && post.likes.includes(user.uid);
              const isReplying = replyPostId === post.id;
              
              return (
                <div 
                  key={post.id}
                  className="rounded-3xl border-2 border-brand-navy bg-white p-4 shadow-[4px_4px_0px_0px_var(--color-brand-navy)] space-y-3 relative"
                >
                  {/* Top Header info */}
                  <div className="flex justify-between items-center pb-2 border-b border-brand-navy/5">
                    <div className="flex items-center gap-2">
                      <img
                        src={post.userPhotoURL}
                        alt={post.userDisplayName}
                        className="h-9 w-9 rounded-full border border-brand-navy object-cover"
                      />
                      <div>
                        <h4 className="text-xs font-extrabold text-brand-navy">{post.userDisplayName}</h4>
                        <span className="text-[9px] font-mono font-bold text-brand-navy/40">{new Date(post.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Badge type tag */}
                    <span className={`text-[9px] font-bold uppercase border border-brand-navy/30 px-1.5 py-0.5 rounded-lg ${
                      post.type === 'review' ? 'bg-brand-sand/30 text-brand-navy' :
                      post.type === 'milestone' ? 'bg-brand-sage/20 text-brand-navy' :
                      'bg-brand-paper text-brand-navy'
                    }`}>
                      {post.type}
                    </span>
                  </div>

                  {/* Association detail */}
                  {post.bookTitle && (
                    <div className="inline-flex items-center gap-1.5 bg-brand-paper border border-brand-navy/15 px-2 py-0.5 rounded-lg text-[10px] font-extrabold text-brand-navy">
                      <BookOpen className="h-3 w-3 text-brand-clay" /> Related Book: "{post.bookTitle}"
                      {post.rating !== undefined && (
                        <div className="flex gap-0.5 ml-1">
                          {Array.from({ length: post.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-brand-sand text-brand-navy" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Post body */}
                  <p className="text-xs font-medium text-brand-navy/85 leading-relaxed">
                    {post.content}
                  </p>

                  {/* Actions Row */}
                  <div className="flex items-center gap-4 text-[11px] font-bold text-brand-navy/60 pt-2 border-t border-brand-navy/5">
                    {/* Like button */}
                    <button 
                      onClick={() => toggleLikePost(post.id)}
                      disabled={!user}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-brand-paper transition-colors ${
                        isLiked ? 'text-red-500 font-extrabold' : ''
                      } disabled:opacity-40`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
                      <span>{post.likes.length} Like{post.likes.length !== 1 ? 's' : ''}</span>
                    </button>

                    {/* Comment button */}
                    <button 
                      onClick={() => {
                        if (!user) return;
                        setReplyPostId(isReplying ? null : post.id);
                        setReplyContent('');
                      }}
                      disabled={!user}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-brand-paper transition-colors disabled:opacity-40"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{post.replies.length} Comment{post.replies.length !== 1 ? 's' : ''}</span>
                    </button>
                  </div>

                  {/* Inner comments list */}
                  {post.replies.length > 0 && (
                    <div className="space-y-2.5 bg-brand-paper/30 border border-brand-navy/10 p-3 rounded-2xl">
                      {post.replies.map((rep) => (
                        <div key={rep.id} className="flex gap-2 items-start text-xs">
                          <CornerDownRight className="h-4 w-4 text-brand-navy/30 shrink-0 mt-0.5" />
                          <img
                            src={rep.userPhotoURL}
                            alt={rep.userDisplayName}
                            className="h-6 w-6 rounded-full border border-brand-navy object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-extrabold text-brand-navy text-[11px]">{rep.userDisplayName}</span>
                              <span className="text-[8px] font-bold text-brand-navy/40">{new Date(rep.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs font-semibold text-brand-navy/80 leading-snug mt-0.5">{rep.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline comments quick composer */}
                  {isReplying && (
                    <div className="flex gap-2 pt-2 items-center">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a supportive reply or answer..."
                        className="flex-1 rounded-xl border-2 border-brand-navy bg-white px-3 py-1.5 text-xs font-bold text-brand-navy outline-none placeholder:text-brand-navy/35 focus:bg-brand-cream"
                      />
                      <button
                        onClick={() => handleCreateReply(post.id)}
                        disabled={!replyContent.trim()}
                        className="px-3.5 py-1.5 bg-brand-clay hover:bg-brand-clay/90 disabled:opacity-40 text-white rounded-xl text-xs font-bold"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
