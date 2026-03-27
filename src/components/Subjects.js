import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const addSubject = async () => {
    if (newSubject.trim()) {
      await addDoc(collection(db, 'subjects'), {
        title: newSubject,
        participants: []
      });
      setNewSubject('');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl text-[#4433b9] font-bold mb-4">Sujets de discussion</h1>

      <div className="flex space-x-4 mb-6">
        <input
          type="text"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Ajouter un nouveau sujet"
          className="flex-grow p-2 border rounded text-sm"
        />
        <button
          onClick={addSubject}
          className="bg-[#4433b9] text-white py-2 px-4 rounded hover:bg-[#3322a1]"
        >
          Ajouter
        </button>
      </div>

      <ul className="space-y-4">
        {subjects.map(subject => (
          <li key={subject.id} className="p-4 border rounded shadow-sm hover:shadow-md transition">
            <Link to={`/dashboard/chat/${subject.id}`} className="text-lg text-[#4433b9]">
              {subject.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Subjects;
