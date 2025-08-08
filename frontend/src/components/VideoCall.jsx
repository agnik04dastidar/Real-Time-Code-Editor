import * as React from 'react';
import { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import './VideoCall.css';

function randomID(len) {
  let result = '';
  if (result) return result;
  var chars = '12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP',
    maxPos = chars.length,
    i;
  len = len || 5;
  for (i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

export function getUrlParams(
  url = window.location.href
) {
  let urlStr = url.split('?')[1];
  return new URLSearchParams(urlStr);
}

export default function VideoCall() {
  const roomID = getUrlParams().get('roomID') || randomID(5);
  const meetingContainerRef = useRef(null);
  const zpRef = useRef(null);

  useEffect(() => {
    const initMeeting = async () => {
      if (!meetingContainerRef.current) return;

      // Get credentials from environment variables
      const appID = parseInt(import.meta.env.VITE_ZEGOCLOUD_APP_ID || '1430253810');
      const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET || '142fc8588c9d02a4a05f70f97fb9ea36';

      if (!appID || !serverSecret) {
        console.error('ZegoCloud credentials not configured');
        return;
      }

      try {
        // Generate Kit Token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomID,
          randomID(5),
          randomID(5)
        );

        // Create instance object from Kit Token
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        // Start the call
        zp.joinRoom({
          container: meetingContainerRef.current,
          sharedLinks: [
            {
              name: 'Personal link',
              url:
                window.location.protocol + '//' +
                window.location.host + window.location.pathname +
                '?roomID=' +
                roomID,
            },
          ],
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall,
          },
          showPreJoinView: true,
          showTextChat: true,
          showUserList: true,
          maxUsers: 50,
          layout: "Auto",
          showLayoutButton: true,
          showScreenSharingButton: true,
          showTurnOffRemoteCameraButton: true,
          showTurnOffRemoteMicrophoneButton: true,
          showRemoveUserButton: true,
        });
      } catch (error) {
        console.error('Failed to initialize ZegoCloud meeting:', error);
      }
    };

    initMeeting();

    // Cleanup function
    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
      }
    };
  }, [roomID]);

  return (
    <div className="video-call-container">
      <div
        className="meeting-container"
        ref={meetingContainerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
