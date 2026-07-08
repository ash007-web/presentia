export const notify = (title: string, description: string, priority: 'high' | 'normal' | 'low' = 'normal') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('add_notification', {
      detail: { title, description, priority }
    }));
  }
};
