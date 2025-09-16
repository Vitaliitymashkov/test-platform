export const debugAuth = () => {
  const token = localStorage.getItem('token');
  console.log('=== Auth Debug Info ===');
  console.log('Token exists:', !!token);
  console.log('Token length:', token?.length);
  console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'null');
  console.log('LocalStorage keys:', Object.keys(localStorage));
  return token;
};

// Add this to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}