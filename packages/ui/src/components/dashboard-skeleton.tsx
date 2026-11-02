import styles from "./dashboard-skeleton.module.css";

export function DashboardSkeleton({
  dark = false,
  error,
  onRetry,
}: {
  dark?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.root} data-dark={dark} role="status" aria-label="Loading dashboard">
      {error && (
        <div className={styles.feedback} role="alert">
          <span>{error}</span>
          {onRetry && <button type="button" onClick={onRetry}>Retry now</button>}
        </div>
      )}
      <div className={styles.layout} aria-hidden="true">
        <aside className={styles.sidebar}>
          <div className={styles.brand}><div className={styles.block} /></div>
          <div className={styles.navigation}>
            {Array.from({ length: 12 }, (_, index) => (
              <div className={styles.navItem} key={index}>
                <div className={styles.icon} /><div className={styles.block} />
              </div>
            ))}
          </div>
        </aside>
        <div className={styles.main}>
          <div className={styles.topbar}>
            <div className={styles.title} /><div className={styles.avatar} />
          </div>
          <div className={styles.content}>
            <div className={styles.heading}>
              <div className={styles.title} /><div className={styles.subtitle} />
            </div>
            <div className={styles.banner}><div className={styles.subtitle} /></div>
            <div className={styles.stats}>
              {Array.from({ length: 6 }, (_, index) => (
                <div className={styles.card} key={index}>
                  <div className={styles.icon} />
                  <div className={styles.statLines}>
                    <div className={styles.subtitle} /><div className={styles.value} />
                    <div className={styles.block} />
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.panels}>
              {Array.from({ length: 4 }, (_, index) => (
                <div className={styles.panel} key={index}>
                  <div className={styles.title} />
                  <div className={styles.chart}>
                    {[55, 80, 65, 95, 70, 85].map((height, bar) => (
                      <div className={styles.block} style={{ height: `${height}%` }} key={bar} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
