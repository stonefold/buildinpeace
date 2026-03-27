import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { useParams } from 'react-router-dom';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';

const ChatSubject = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const messagesRef = collection(db, 'subjects', id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data()));
    });

    return () => unsubscribe();
  }, [id]);

  const sendMessage = async () => {
    if (newMessage.trim()) {
      const user = auth.currentUser;
      await addDoc(collection(db, 'subjects', id, 'messages'), {
        text: newMessage,
        createdAt: new Date(),
        uid: user.uid,
        displayName: user.displayName
      });
      setNewMessage('');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl text-[#4433b9] font-bold mb-4">Conversation</h2>

      <div className="mb-6 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg shadow-md text-sm ${
              msg.uid === auth.currentUser.uid ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'
            }`}
          >
            <p className="font-semibold">{msg.displayName}</p>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      <div className="flex space-x-4">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Votre message"
          className="flex-grow p-2 border rounded text-sm"
        />
        <button
          onClick={sendMessage}
          className="bg-[#4433b9] text-white py-2 px-4 rounded hover:bg-[#3322a1]"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default ChatSubject;
