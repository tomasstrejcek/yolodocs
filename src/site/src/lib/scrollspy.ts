export function setupScrollspy(
  containerSelector: string,
  itemSelector: string,
  onActive: (id: string) => void
) {
  if (typeof window === "undefined") return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onActive(entry.target.id);
        }
      }
    },
    {
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    }
  );

  const items = document.querySelectorAll(itemSelector);
  items.forEach((item) => observer.observe(item));

  return () => observer.disconnect();
}
