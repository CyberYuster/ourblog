/*
// Global authentication state
let isAuthenticated = false;

// Main initialization function
async function initializeAuth() {
  console.log('Initializing authentication check');
  
  // Check URL for logout parameter first
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('logout')) {
    console.log('Logout cleanup initiated');
    await performLogoutCleanup();
    return;
  }

  // Check current auth status
  await checkAuthStatus();
}

// Perform cleanup after logout
async function performLogoutCleanup() {
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Remove logout parameter from URL
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
  
  // Check auth status with server
  await checkAuthStatus();
  
  // Force UI update
  updateAuthUI();
}

// Check authentication status with server
async function checkAuthStatus() {
  try {
    console.log('Checking authentication status');
    const response = await fetch('/api/auth/status', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Auth status response:', data);
    
    isAuthenticated = !!data.authenticated;
    updateAuthUI();
    
    return data;
  } catch (error) {
    console.error('Auth check failed:', error);
    return { authenticated: false };
  }
}

// Update UI based on auth state
function updateAuthUI() {
  console.log(`Updating UI for auth state: ${isAuthenticated}`);
  
  // Update menu visibility
  document.querySelectorAll('.user-menu').forEach(el => {
    el.style.display = isAuthenticated ? 'block' : 'none';
  });
  
  document.querySelectorAll('.guest-menu').forEach(el => {
    el.style.display = isAuthenticated ? 'none' : 'block';
  });
  
  // Update any other auth-dependent elements
  document.querySelectorAll('[data-auth-only]').forEach(el => {
    el.style.display = isAuthenticated ? '' : 'none';
  });
  
  document.querySelectorAll('[data-guest-only]').forEach(el => {
    el.style.display = isAuthenticated ? 'none' : '';
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeAuth);

// Export for testing/debugging
if (typeof module === 'undefined') {
  window.authModule = {
    initializeAuth,
    checkAuthStatus,
    updateAuthUI,
    performLogoutCleanup
  };
}
*/

(function() {
  console.log("Auth system initializing...");

  // 1. Check for logout right away
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('logout')) {
    console.log("Performing post-logout cleanup");
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 2. Update UI based on auth state
  async function updateAuthUI() {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      const { authenticated } = await response.json();
      console.log(`Auth state: ${authenticated}`);
      
      document.querySelectorAll('.user-menu').forEach(el => {
        el.style.display = authenticated ? 'block' : 'none';
      });
      
      document.querySelectorAll('.guest-menu').forEach(el => {
        el.style.display = authenticated ? 'none' : 'block';
      });
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  }

  // 3. Set up event listeners
  document.addEventListener('DOMContentLoaded', updateAuthUI);
  
  // For pages that load dynamically
  if (document.readyState !== 'loading') {
    updateAuthUI();
  } else {
    document.addEventListener('DOMContentLoaded', updateAuthUI);
  }

  // Expose for debugging
  window.auth = { updateAuthUI };
})();

// document.addEventListener('DOMContentLoaded', () => {
//   console.log('DOM fully loaded');
//     // Check for logout parameter
//     const urlParams = new URLSearchParams(window.location.search);
//     if (urlParams.has('logout')) {
//       console.log('Logout parameter detected');
//       // Clear any residual data
//       localStorage.clear();
//       sessionStorage.clear();
      
//       // Remove the logout parameter from URL
//       const cleanUrl = window.location.pathname;
//       window.history.replaceState({}, document.title, cleanUrl);
      
//       // Force a check with the server
//       checkAuthStatus();
//       console.log("hi");
//     }
//   });
  
//   async function checkAuthStatus() {
//     try {
//       const response = await fetch('/api/auth/status', {
//         method: 'GET',
//         headers: {
//           'Cache-Control': 'no-cache'
//         },
//         credentials: 'include'
//       });
      
//       const data = await response.json();
//       console.log("logged data ",data);
//       if (!data.authenticated) {
//         // Update UI to show logged out state
//         document.querySelectorAll('.user-menu').forEach(el => el.style.display = 'none');
//         document.querySelectorAll('.guest-menu').forEach(el => el.style.display = 'block');
//       }
//     } catch (error) {
//       console.error('Auth check failed:', error);
//     }
//   }


// Function to load comments for a post
// async function loadComments(postId, page = 1) {
//   try {
//       const response = await fetch(`/posts/${postId}/comments?page=${page}`);
//       const data = await response.json();
      
//       if (data.comments && data.comments.length > 0) {
//           const commentsContainer = document.querySelector(`#comments-${postId} .comments-list`);
          
//           data.comments.forEach(comment => {
//               const commentElement = createCommentElement(comment);
//               commentsContainer.appendChild(commentElement);
//           });
          
//           // Update pagination controls
//           updatePaginationControls(postId, data);
//       }
//   } catch (error) {
//       console.error('Error loading comments:', error);
//   }
// }

// // Function to create a comment element
// function createCommentElement(comment) {
//   const commentDiv = document.createElement('div');
//   commentDiv.className = 'comment';
//   commentDiv.dataset.commentId = comment._id;
  
//   commentDiv.innerHTML = `
//       <div class="comment-header">
//           <strong>${comment.author}</strong>
//           <small>${new Date(comment.createdAt).toLocaleString()}</small>
//       </div>
//       <div class="comment-content">${comment.content}</div>
      
//       <% if (isAuthenticated) { %>
//           <div class="comment-actions">
//               <button class="reply-btn" data-comment-id="${comment._id}">Reply</button>
//               <% if (comment.canEdit) { %>
//                   <button class="edit-btn" data-comment-id="${comment._id}">Edit</button>
//                   <button class="delete-btn" data-comment-id="${comment._id}">Delete</button>
//               <% } %>
//           </div>
//       <% } %>
      
//       <div class="replies-container"></div>
//   `;
  
//   return commentDiv;
// }

// // Initialize comment functionality when page loads
// document.addEventListener('DOMContentLoaded', function() {
//   // Toggle comments visibility
//   document.querySelectorAll('.toggle-comments').forEach(button => {
//       button.addEventListener('click', function() {
//           const postId = this.closest('.post').dataset.postId;
//           const commentsContainer = document.querySelector(`#comments-${postId}`);
          
//           if (commentsContainer.style.display === 'none') {
//               commentsContainer.style.display = 'block';
//               loadComments(postId);
//           } else {
//               commentsContainer.style.display = 'none';
//           }
//       });
//   });
// });