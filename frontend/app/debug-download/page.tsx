"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function DebugDownloadPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [downloadResult, setDownloadResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { data: session } = authClient.useSession();

  const testUserInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/info');
      const data = await response.json();
      setUserInfo(data);
      console.log('User info:', data);
    } catch (error) {
      console.error('Error fetching user info:', error);
      setUserInfo({ error: error.message });
    }
    setLoading(false);
  };

  const testGitHubDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/download/github');
      
      if (response.ok && response.headers.get('content-type') === 'application/octet-stream') {
        // File download successful
        setDownloadResult({ 
          success: true, 
          message: 'File download initiated successfully',
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          endpoint: 'GitHub'
        });
        console.log('GitHub download: File download initiated');
      } else {
        // Error response, try to parse JSON
        const data = await response.json();
        setDownloadResult({ ...data, endpoint: 'GitHub' });
        console.log('GitHub download result:', data);
      }
    } catch (error) {
      console.error('Error testing GitHub download:', error);
      setDownloadResult({ error: error.message, endpoint: 'GitHub' });
    }
    setLoading(false);
  };

  const testRegularDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/download');
      
      if (response.ok && response.headers.get('content-type') === 'application/octet-stream') {
        // File download successful
        setDownloadResult({ 
          success: true, 
          message: 'File download initiated successfully',
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          endpoint: 'Regular'
        });
        console.log('Regular download: File download initiated');
      } else {
        // Error response, try to parse JSON
        const data = await response.json();
        setDownloadResult({ ...data, endpoint: 'Regular' });
        console.log('Regular download result:', data);
      }
    } catch (error) {
      console.error('Error testing regular download:', error);
      setDownloadResult({ error: error.message, endpoint: 'Regular' });
    }
    setLoading(false);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl mb-4">Debug Download - Please Login</h1>
        <p>You need to be logged in to use this debug page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl mb-8">Download Debug Page</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl mb-4">Current Session</h2>
          <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div>
          <button 
            onClick={testUserInfo}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mr-4"
          >
            {loading ? 'Loading...' : 'Test User Info API'}
          </button>

          {userInfo && (
            <div className="mt-4">
              <h3 className="text-lg mb-2">User Info Result:</h3>
              <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(userInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={testGitHubDownload}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mr-4"
          >
            {loading ? 'Loading...' : 'Test GitHub Download API (Sudo)'}
          </button>

          <button 
            onClick={testRegularDownload}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            {loading ? 'Loading...' : 'Test Regular Download API (Paying Users)'}
          </button>

          {downloadResult && (
            <div className="mt-4">
              <h3 className="text-lg mb-2">Download Result ({downloadResult.endpoint}):</h3>
              <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(downloadResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl mb-4">Environment Check</h2>
          <p>Check your browser console for additional debugging logs.</p>
        </div>
      </div>
    </div>
  );
} 