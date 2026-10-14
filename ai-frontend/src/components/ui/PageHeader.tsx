import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  const actionContent = actions || children;
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actionContent && <div className="page-actions">{actionContent}</div>}
    </div>
  );
}
