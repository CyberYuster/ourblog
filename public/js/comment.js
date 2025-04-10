// Global variables for pagination
const COMMENTS_PER_PAGE = 2;
let currentPage = {};
let totalComments = {};

document.addEventListener('DOMContentLoaded', () => {
    // Load comments for all posts when page loads
    document.querySelectorAll('.post').forEach(postElement => {
        const postId = postElement.dataset.postId;
        // loadComments(postId);
        currentPage[postId] = 1;
        totalComments[postId] = 0;
    });
    
    // Toggle comments visibility
    document.querySelectorAll('.toggle-comments').forEach(button => {
        button.addEventListener('click', function() {
            const postId = this.closest('.post').dataset.postId;
            const commentsContainer = document.getElementById(`comments-${postId}`);
            
            if (commentsContainer.style.display === 'none') {
                commentsContainer.style.display = 'block';
                this.classList.add('active');
                loadComments(postId); // Refresh comments when expanded
            } else {
                commentsContainer.style.display = 'none';
                this.classList.remove('active');
            }
        });
    });
    
    // Comment form submission
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const postId = form.elements.postId.value;
            const author = form.elements.author.value;
            const content = form.elements.content.value;
            
            try {
                const submitBtn = form.querySelector('.submit-btn');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Posting...';
                
                const response = await fetch(`/posts/${postId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ author, content })
                });
                
                if (response.ok) {
                    form.reset();
                    currentPage[postId] = 1;
                    await loadComments(postId);
                    updateCommentsCount(postId);
                }
            } catch (err) {
                console.error('Error submitting comment:', err);
            } finally {
                const submitBtn = form.querySelector('.submit-btn');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post Comment';
            }
        });
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Load More button click handler
    document.addEventListener('click', async function(e) {
        if (e.target.classList.contains('load-more-btn')) {
            const postId = e.target.closest('.post').dataset.postId;
            await loadMoreComments(postId);
        }
    });
});

// Load comments for a specific post
async function loadComments(postId) {
    try {
        const container = document.getElementById(`comments-${postId}`);
        if (!container) return;
        
        // container.innerHTML = '<p>Loading comments...</p>';
        const commentsList = container.querySelector('.comments-list');
        commentsList.innerHTML = '<p>Loading comments...</p>';
        
        const response = await fetch(`/posts/${postId}/comments?page=1&limit=${COMMENTS_PER_PAGE}`);
        const { comments, total } = await response.json();
        
        commentsList.innerHTML = '';
        totalComments[postId] = total;

        if (comments.length === 0) {
            commentsList.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
            updateCommentsCount(postId, 0);
            return;
        }

        comments.forEach(comment => {
            commentsList.insertAdjacentHTML('beforeend', renderComment(comment));
        });
        
        updateCommentsCount(postId, total);
        updatePaginationUI(postId);
        attachCommentActionsListeners(postId);
        
        // container.innerHTML = comments.map(comment => renderComment(comment)).join('');
        // updateCommentsCount(postId, comments.length);
        
        // // Attach event listeners to action buttons
        // attachCommentActionsListeners(postId);
    } catch (err) {
        console.error(`Error loading comments for post ${postId}:`, err);
        const container = document.getElementById(`comments-${postId}`);
        if (container) {
            // container.innerHTML = '<p class="error">Failed to load comments. Please try again.</p>';
            const errorMsg = err.message || 'Failed to load comments';
            container.querySelector('.comments-list').innerHTML = `<p class="error">${errorMsg}</p>
            <p>Please refresh the page or try again later.</p>`;
        }
    }
}

// Load more comments
async function loadMoreComments(postId) {
    try {
        const container = document.getElementById(`comments-${postId}`);
        if (!container) return;
        
        const loadMoreBtn = container.querySelector('.load-more-btn');
        const loadingIndicator = container.querySelector('.loading-indicator');
        const commentsList = container.querySelector('.comments-list');
        
        loadMoreBtn.style.display = 'none';
        loadingIndicator.style.display = 'block';
        
        currentPage[postId]++;
        const response = await fetch(`/posts/${postId}/comments?page=${currentPage[postId]}&limit=${COMMENTS_PER_PAGE}`);
        const { comments } = await response.json();
        comments.forEach(comment => {
            commentsList.insertAdjacentHTML('beforeend', renderComment(comment));
        });
        
        updatePaginationUI(postId);
        attachCommentActionsListeners(postId);
    } catch (err) {
        console.error(`Error loading more comments for post ${postId}:`, err);
    } finally {
        const container = document.getElementById(`comments-${postId}`);
        if (container) {
            const loadingIndicator = container.querySelector('.loading-indicator');
            loadingIndicator.style.display = 'none';
        }
    }
}

// Update pagination UI
function updatePaginationUI(postId) {
    const container = document.getElementById(`comments-${postId}`);
    if (!container) return;
    
    const loadMoreBtn = container.querySelector('.load-more-btn');
    const commentsList = container.querySelector('.comments-list');
    const displayedComments = commentsList.querySelectorAll('.comment').length;
    
    if (displayedComments < totalComments[postId]) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Render a single comment with replies
function renderComment(comment) {
    return `
        <div class="comment" data-comment-id="${comment._id}">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-time">${new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
            <div class="comment-actions">
                <button class="comment-action reply-btn">Reply</button>
                ${comment.canEdit ? `
                    <button class="comment-action edit-btn">Edit</button>
                    <button class="comment-action delete-btn">Delete</button>
                ` : ''}
            </div>
            ${comment.replies && comment.replies.length > 0 ? `
                <div class="replies">
                    ${comment.replies.map(reply => renderComment(reply)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Update comments count display
function updateCommentsCount(postId, count) {
    const countElement = document.querySelector(`.post[data-post-id="${postId}"] .comments-count`);
    if (countElement) {
        if (typeof count !== 'undefined') {
            countElement.textContent = count;
        } else {
            // If count not provided, count visible comments
            const container = document.getElementById(`comments-${postId}`);
            if (container) {
                const actualCount = container.querySelectorAll('.comment').length;
                countElement.textContent = actualCount;
            }
        }
    }
}

// Attach event listeners to comment action buttons
function attachCommentActionsListeners(postId) {
    // Reply buttons
    document.querySelectorAll(`#comments-${postId} .reply-btn`).forEach(button => {
        button.addEventListener('click', function() {
            const commentId = this.closest('.comment').dataset.commentId;
            openReplyModal(postId, commentId);
        });
    });
    
    // Edit buttons
    document.querySelectorAll(`#comments-${postId} .edit-btn`).forEach(button => {
        button.addEventListener('click', function() {
            const commentElement = this.closest('.comment');
            const commentId = commentElement.dataset.commentId;
            const content = commentElement.querySelector('.comment-content').textContent;
            openEditModal(commentId, content);
        });
    });
    
    // Delete buttons
    document.querySelectorAll(`#comments-${postId} .delete-btn`).forEach(button => {
        button.addEventListener('click', function() {
            const commentId = this.closest('.comment').dataset.commentId;
            if (confirm('Are you sure you want to delete this comment?')) {
                deleteComment(postId, commentId);
            }
        });
    });
}

// Open reply modal
function openReplyModal(postId, commentId) {
    const modal = document.getElementById('replyModal');
    document.getElementById('replyToPostId').value = postId;
    document.getElementById('replyToCommentId').value = commentId;
    modal.style.display = 'block';
    
    // Set up reply form submission
    document.getElementById('replyForm').onsubmit = async (e) => {
        e.preventDefault();
        const author = document.getElementById('replyAuthor').value;
        const content = document.getElementById('replyContent').value;
        
        try {
            const response = await fetch(`/posts/${postId}/comments/${commentId}/replies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ author, content })
            });
            
            if (response.ok) {
                modal.style.display = 'none';
                document.getElementById('replyForm').reset();
                await loadComments(postId);
                updateCommentsCount(postId);
            }
        } catch (err) {
            console.error('Error submitting reply:', err);
        }
    };
}

// Open edit modal
function openEditModal(commentId, currentContent) {
    const modal = document.getElementById('editModal');
    document.getElementById('editCommentId').value = commentId;
    document.getElementById('editContent').value = currentContent;
    modal.style.display = 'block';
    
    // Set up edit form submission
    document.getElementById('editForm').onsubmit = async (e) => {
        e.preventDefault();
        const content = document.getElementById('editContent').value;
        const postId = document.querySelector(`.comment[data-comment-id="${commentId}"]`).closest('.post').dataset.postId;
        
        try {
            const response = await fetch(`/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                modal.style.display = 'none';
                await loadComments(postId);
            }
        } catch (err) {
            console.error('Error updating comment:', err);
        }
    };
}

// Delete comment
async function deleteComment(postId, commentId) {
    try {
        const response = await fetch(`/comments/${commentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadComments(postId);
            updateCommentsCount(postId);
        }
    } catch (err) {
        console.error('Error deleting comment:', err);
    }
}