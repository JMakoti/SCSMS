"use client";

export function PageHeader({
  title,
  description,
  action,
  eyebrow = "Overview",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="breadcrumbs">
          <span>SC-SMS</span>
          <span>/</span>
          <span>{eyebrow}</span>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export default PageHeader;
