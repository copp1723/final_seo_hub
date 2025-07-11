import React, { ReactNode, useState } from 'react';

interface TooltipProps {
  content?: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TooltipProviderProps {
  children: ReactNode;
  delayDuration?: number;
}

interface TooltipTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

interface TooltipContentProps {
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children }) => {
  return <>{children}</>;
};

export const TooltipContent: React.FC<TooltipContentProps> = ({ children, side = 'top' }) => {
  return (
    <span
      style={{
        position: 'absolute',
        zIndex: 1000,
        whiteSpace: 'nowrap',
        background: 'rgba(30, 30, 30, 0.95)',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: 4,
        fontSize: 13,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
        ...getPositionStyle(side),
      }}
      role="tooltip"
    >
      {children}
    </span>
  );
};

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
    >
      {children}
      {visible && content && (
        <span
          style={{
            position: 'absolute',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            background: 'rgba(30, 30, 30, 0.95)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 4,
            fontSize: 13,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            ...getPositionStyle(position),
          }}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
};

function getPositionStyle(position: TooltipProps['position']) {
  switch (position) {
    case 'bottom':
      return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 };
    case 'left':
      return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 };
    case 'right':
      return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 };
    case 'top':
    default:
      return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 };
  }
}

export default Tooltip; 