import React, { useState, useRef, useEffect } from 'react';
import VideoCall from './VideoCall';
import './VideoCallSidebar.css';

const VideoCallSidebar = ({ roomId, userId, isOpen, onToggleOpen }) => {
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);
  const sidebarRef = useRef(null);

  const toggleSidebar = () => {
    onToggleOpen && onToggleOpen(!isOpen);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 280;
    const maxWidth = 600;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <>
      <div 
        ref={sidebarRef}
        className={`video-call-sidebar ${isOpen ? 'open' : ''} ${isResizing ? 'resizing' : ''}`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="sidebar-header">
          <h3>Video Call</h3>
        </div>
        
        <div className="sidebar-content">
          <VideoCall roomId={roomId} userId={userId} />
        </div>
        
        <div 
          className="resize-handle"
          onMouseDown={handleMouseDown}
        />
      </div>
      
      {!isOpen && (
        <button className="floating-btn" onClick={toggleSidebar}>
          📹
        </button>
      )}
    </>
  );
};

export default VideoCallSidebar;