import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { Stage, Layer, Image as KonvaImage, Line, Arrow, Text, Rect, Circle, Transformer } from 'react-konva';
import { doc, updateDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faEraser, faSave, faUndo, faCircle, faSquare, faArrowRight, faTextHeight, faTrash, faSyncAlt, faShapes } from '@fortawesome/free-solid-svg-icons';
import { debounce } from 'lodash';

const Plan = ({ chantierId }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [image, setImage] = useState(null);
  const [lines, setLines] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [tool, setTool] = useState('select');
  const [lineColor, setLineColor] = useState('red');
  const [lineWidth, setLineWidth] = useState(2);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Variable pour controler l'ouverture du menu
  const containerRef = useRef(null); // Reference pour le conteneur de Stage
  const [versions, setVersions] = useState([]); // Liste des versions sauvegardees


  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const transformerRef = useRef(null);
  // Definir handleResize en dehors de useEffect pour qu'il soit disponible dans tout le composant
const handleResize = () => {
  if (stageRef.current && image) {
    const containerWidth = window.innerWidth * 0.95;
    const containerHeight = window.innerHeight * 0.95;  // Augmentez la hauteur pour occuper plus de place
    const imageAspectRatio = image.width / image.height;
    const containerAspectRatio = containerWidth / containerHeight;

    let scale;
    if (imageAspectRatio > containerAspectRatio) {
      scale = containerWidth / image.width;
    } else {
      scale = containerHeight / image.height;
    }

    stageRef.current.width(containerWidth);
    stageRef.current.height(containerHeight);
    stageRef.current.scale({ x: scale, y: scale });
    stageRef.current.batchDraw();
  }
};

const loadVersion = (index) => {
  const version = versions[index];
  setImage(() => {
    const img = new window.Image();
    img.src = version.uri; // Recupere l'URI de la version
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img); // Definit l'image apres le chargement
    return img;
  });
  setShapes(version.shapes);
  setLines(version.lines);
  setAnnotations(version.annotations);
  console.log(`Version ${index + 1} chargee`);
};


const debouncedResize = debounce(handleResize, 100);


useEffect(() => {
  window.addEventListener('resize', handleResize);
  handleResize(); // Appeler handleResize au premier rendu

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, [image]);

useEffect(() => {
  let animationFrameId;

  const observer = new ResizeObserver(() => {
    // Utiliser requestAnimationFrame pour limiter les redimensionnements
    animationFrameId = requestAnimationFrame(() => {
      handleResize();
    });
  });

  if (containerRef.current) {
    observer.observe(containerRef.current);
  }

  return () => {
    if (containerRef.current) {
      observer.unobserve(containerRef.current);
    }
    cancelAnimationFrame(animationFrameId); // Annuler toute animation en cours
  };
}, [image]);

useEffect(() => {
  const observer = new ResizeObserver(() => {
    debouncedResize();
  });

  if (containerRef.current) {
    observer.observe(containerRef.current);
  }

  return () => {
    if (containerRef.current) {
      observer.unobserve(containerRef.current);
    }
    debouncedResize.cancel(); // Annuler les appels en attente
  };
}, [image]);



  useEffect(() => {
    const fetchFiles = async () => {
      if (chantierId) {
        try {
          const listRef = ref(storage, `plans/${chantierId}/`);
          const response = await listAll(listRef);
          const filePromises = response.items.map((item) => getDownloadURL(item));
          const urls = await Promise.all(filePromises);
          setFileList(urls);
        } catch (error) {
          console.error(`Erreur lors du chargement des fichiers pour le chantier ${chantierId} :`, error);
        }
      }
    };

    fetchFiles();
  }, [chantierId]);

  useEffect(() => {
    if (selectedPlan) {
      const img = new window.Image();
      img.src = selectedPlan;
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImage(img);
        setPreviewMode(false);
  
        // Cree la "Version 0" et ajuste sa taille
        if (versions.length === 0) {
          setVersions([{ uri: img.src, shapes: [], lines: [], annotations: [] }]);
        }
  
        // Forcer le redimensionnement apres le chargement de l'image
        handleResize();
      };
    }
  }, [selectedPlan]);
  

  useEffect(() => {
  const handleResize = () => {
    if (stageRef.current && image) {
      const containerWidth = window.innerWidth * 0.95;
      const containerHeight = window.innerHeight * 0.95;  // Augmentez la hauteur pour occuper plus de place
      const imageAspectRatio = image.width / image.height;
      const containerAspectRatio = containerWidth / containerHeight;

      let scale;
      if (imageAspectRatio > containerAspectRatio) {
        scale = containerWidth / image.width;
      } else {
        scale = containerHeight / image.height;
      }

      stageRef.current.width(containerWidth);
      stageRef.current.height(containerHeight);
      stageRef.current.scale({ x: scale, y: scale });
      stageRef.current.batchDraw();
    }
  };

  window.addEventListener('resize', handleResize);
  handleResize();

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, [image]);

useEffect(() => {
  if (isMenuOpen) {
    handleResize(); // Forcer le recalcul lors de l'ouverture du menu
  }
}, [isMenuOpen]);



  useEffect(() => {
    if (transformerRef.current && selectedShapeId) {
      const selectedNode = layerRef.current.findOne(`#${selectedShapeId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedShapeId]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (selectedFile && chantierId) {
      try {
        const fileRef = ref(storage, `plans/${chantierId}/${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        const url = await getDownloadURL(fileRef);
        setFileList((prevList) => [...prevList, url]);
        await updateDoc(doc(db, 'chantiers', chantierId), {
          planUrls: [...fileList, url],
        });
        alert('Plan telecharge et enregistre avec succes !');
      } catch (error) {
        console.error('Erreur lors de l\'upload du fichier :', error);
        alert('Erreur lors du telechargement du fichier.');
      }
    } else {
      alert('Veuillez selectionner un fichier.');
    }
  };

  const handleDeletePlan = async (url) => {
    if (window.confirm('Etes-vous sur de vouloir supprimer ce plan ?')) {
      try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
        setFileList(fileList.filter((file) => file !== url));
        alert('Plan supprime avec succes.');
      } catch (error) {
        console.error('Erreur lors de la suppression du fichier :', error);
        alert('Erreur lors de la suppression du fichier.');
      }
    }
  };

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const clickedOnEmpty = e.target === stage;

    if (clickedOnEmpty) {
      setSelectedShapeId(null);
      return;
    }

    if (tool === 'select') {
      const shape = e.target;
      if (shape) {
        setSelectedShapeId(shape.attrs.id);
        setTool(null);
      }
      return;
    }

    setIsDrawing(true);
    const pos = stage.getPointerPosition();
    const transformedPos = stage.getRelativePointerPosition();

    if (tool === 'pen' || tool === 'eraser') {
      const newLine = {
        id: `line-${lines.length}`,
        points: [transformedPos.x, transformedPos.y],
        stroke: tool === 'pen' ? lineColor : 'white',
        strokeWidth: tool === 'pen' ? lineWidth : 20,
        globalCompositeOperation: tool === 'pen' ? 'source-over' : 'destination-out',
        draggable: false,
      };
      setLines([...lines, newLine]);
    } else if (tool === 'rectangle') {
      const newRect = {
        id: `rect-${shapes.length}`,
        x: transformedPos.x,
        y: transformedPos.y,
        width: 100,
        height: 50,
        stroke: lineColor,
        strokeWidth: lineWidth,
        draggable: true,
      };
      setShapes([...shapes, newRect]);
    } else if (tool === 'circle') {
      const newCircle = {
        id: `circle-${shapes.length}`,
        x: transformedPos.x,
        y: transformedPos.y,
        radius: 30,
        stroke: lineColor,
        strokeWidth: lineWidth,
        draggable: true,
      };
      setShapes([...shapes, newCircle]);
    } else if (tool === 'arrow') {
      const newArrow = {
        id: `arrow-${shapes.length}`,
        points: [transformedPos.x, transformedPos.y, transformedPos.x + 50, transformedPos.y + 50],
        stroke: lineColor,
        strokeWidth: lineWidth,
        draggable: true,
      };
      setShapes([...shapes, newArrow]);
    } else if (tool === 'text') {
      const newText = {
        id: `text-${annotations.length}`,
        x: transformedPos.x,
        y: transformedPos.y,
        text: 'Double-cliquez pour editer',
        fontSize: 20,
        fill: lineColor,
        draggable: true,
      };
      setAnnotations([...annotations, newText]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || (tool !== 'pen' && tool !== 'eraser')) return;
    const stage = e.target.getStage();
    const transformedPos = stage.getRelativePointerPosition();
    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([transformedPos.x, transformedPos.y]);
    setLines([...lines.slice(0, -1), lastLine]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleDblClickShape = (e) => {
    const shape = e.target;
    if (shape) {
      setSelectedShapeId(shape.attrs.id);
      setTool(null);
    }
  };

  const handleDblClickText = (e) => {
    if (e.target.getClassName() === 'Text') {
      const textNode = e.target;
      const newText = prompt('Modifiez le texte :', textNode.text());
      if (newText !== null) {
        const updatedAnnotations = annotations.map((annotation) =>
          annotation.id === textNode.attrs.id ? { ...annotation, text: newText } : annotation
        );
        setAnnotations(updatedAnnotations);
        setSelectedShapeId(textNode.attrs.id);
        setTool(null);
      }
    }
  };

  const handleClear = () => {
    setLines([]);
    setShapes([]);
    setAnnotations([]);
    setSelectedShapeId(null);
    console.log('Tous les elements ont ete effaces');
  };

  const handleDeleteSelectedShape = () => {
    if (selectedShapeId) {
      if (selectedShapeId.startsWith('rect') || selectedShapeId.startsWith('circle') || selectedShapeId.startsWith('arrow')) {
        setShapes(shapes.filter((shape) => shape.id !== selectedShapeId));
      } else if (selectedShapeId.startsWith('text')) {
        setAnnotations(annotations.filter((annotation) => annotation.id !== selectedShapeId));
      } else if (selectedShapeId.startsWith('line')) {
        setLines(lines.filter((line) => line.id !== selectedShapeId));
      }
      setSelectedShapeId(null);
    }
  };

  const saveDrawing = () => {
    const uri = stageRef.current.toDataURL();
    setVersions([...versions, { uri, shapes, lines, annotations }]);
    console.log('Nouvelle version sauvegardee');
  };
  

  return (
    <div>
      {previewMode ? (
        <div>
          <h3 className="text-lg font-bold mb-4">Liste des plans</h3>
          <input type="file" onChange={handleFileChange} className="mb-2" />
          <button onClick={uploadFile} className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-500 mt-2">
            Telecharger
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {fileList.map((url, index) => (
              <div
                key={index}
                className="border p-2 rounded shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => setSelectedPlan(url)}
              >
                <img src={url} alt={`Plan ${index + 1}`} className="w-full h-32 object-cover mb-2" />
                <button className="text-blue-600 hover:underline w-full text-center" onClick={() => setSelectedPlan(url)}>
                  {`Plan ${index + 1}`}
                </button>
                <button onClick={() => handleDeletePlan(url)} className="mt-2 p-1 bg-red-500 text-white rounded w-full">
                  <FontAwesomeIcon icon={faTrash} /> Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="flex flex-col md:flex-row">
  {/* Panneau des versions sauvegardees avec style ameliore */}
  <div className="version-container w-full md:w-1/4 md:ml-4 mb-4 md:mb-0 bg-white p-3 rounded-lg shadow border border-gray-200">
    <h3 className="text-lg font-bold mb-4">Versions sauvegardees</h3>
    <div className="grid grid-cols-2 gap-2">
      {versions.map((version, index) => (
        <div
          key={index}
          className="version-thumbnail cursor-pointer border border-gray-300 rounded-lg p-1 shadow-sm hover:shadow-md flex flex-col items-center"
          onClick={() => loadVersion(index)}
        >
          <img src={version.uri || 'path/to/placeholder.png'} alt={`Version ${index}`} className="w-20 h-20 object-cover rounded mb-1" />
          <span className="text-center block text-xs font-semibold">{`Version ${index}`}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Zone de dessin */}
  <div className="flex-1">
    <div className="flex flex-wrap items-center justify-center md:justify-start gap-1 p-2 bg-gray-100 shadow-inner rounded-lg mb-4">
      {/* Boutons d'outils compacts */}
      <button onClick={() => setTool('select')} className={`p-1 ${tool === 'select' ? 'bg-blue-500 text-white' : 'bg-white'} shadow rounded`}>
        <FontAwesomeIcon icon={faShapes} title="Selection" />
      </button>
      <button onClick={() => setTool('pen')} className={`p-1 ${tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-white'} shadow rounded`}>
        <FontAwesomeIcon icon={faPencilAlt} title="Crayon" />
      </button>
      <button onClick={() => setTool('eraser')} className={`p-1 ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-white'} shadow rounded`}>
        <FontAwesomeIcon icon={faEraser} title="Gomme" />
      </button>
      <button onClick={() => setTool('rectangle')} className={`p-1 ${tool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-white'} shadow rounded`}>
        <FontAwesomeIcon icon={faSquare} title="Rectangle" />
      </button>
      <button onClick={() => setTool('circle')} className={`p-1 ${tool === 'circle' ? 'bg-blue-500 text-white' : 'bg-white'} shadow rounded`}>
        <FontAwesomeIcon icon={faCircle} title="Cercle" />
      </button>
      <button onClick={() => setTool('arrow')} className={`p-1 ${tool === 'arrow' ? 'bg-blue-500 text-white' : 'bg-white'} shadow rounded`}>
        <FontAwesomeIcon icon={faArrowRight} title="Fleche" />
      </button>
      <button onClick={() => setTool('text')} className={`p-1 ${tool === 'text' ? 'bg-blue-500 text-white' : 'bg-white'} shadow rounded`}>
        <FontAwesomeIcon icon={faTextHeight} title="Texte" />
      </button>
      <button onClick={handleClear} className="p-1 bg-red-500 text-white shadow rounded">
        <FontAwesomeIcon icon={faUndo} title="Effacer tout" />
      </button>
      <button onClick={saveDrawing} className="p-1 bg-green-500 text-white shadow rounded">
        <FontAwesomeIcon icon={faSave} title="Sauvegarder" />
      </button>
      <button onClick={handleDeleteSelectedShape} className="p-1 bg-red-500 text-white shadow rounded">
        <FontAwesomeIcon icon={faTrash} title="Supprimer l'element" />
      </button>
      <button
        onClick={() => {
          if (image) {
            const newImage = { ...image, rotation: (image.rotation || 0) + 90 };
            setImage(newImage);
          }
        }}
        className="p-1 bg-gray-300 shadow rounded"
        title="Rotation de l'image"
      >
        <FontAwesomeIcon icon={faSyncAlt} />
      </button>
    </div>
    
    {/* Stage de dessin */}
    <Stage
      width={window.innerWidth * 0.95}
      height={window.innerHeight * 0.75}
      ref={stageRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      style={{ border: '1px solid #ccc', maxWidth: '100%', margin: '0 auto', overflow: 'hidden' }}
    >
      <Layer ref={layerRef}>
        {image && <KonvaImage image={image} x={0} y={0} rotation={image.rotation || 0} />}
        {lines.map((line) => (
          <Line
            key={line.id}
            id={line.id}
            points={line.points}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth}
            tension={0.5}
            lineCap="round"
            globalCompositeOperation={line.globalCompositeOperation}
            draggable
            onDblClick={handleDblClickShape}
          />
        ))}
        {shapes.map((shape) => {
          if (shape.id.startsWith('rect')) {
            return (
              <Rect
                key={shape.id}
                id={shape.id}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                draggable
                onDblClick={handleDblClickShape}
              />
            );
          } else if (shape.id.startsWith('circle')) {
            return (
              <Circle
                key={shape.id}
                id={shape.id}
                x={shape.x}
                y={shape.y}
                radius={shape.radius}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                draggable
                onDblClick={handleDblClickShape}
              />
            );
          } else if (shape.id.startsWith('arrow')) {
            return (
              <Arrow
                key={shape.id}
                id={shape.id}
                points={shape.points}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                draggable
                onDblClick={handleDblClickShape}
              />
            );
          }
          return null;
        })}
        {annotations.map((annotation) => (
          <Text
            key={annotation.id}
            id={annotation.id}
            x={annotation.x}
            y={annotation.y}
            text={annotation.text}
            fontSize={annotation.fontSize}
            fill={annotation.fill}
            draggable
            onDblClick={handleDblClickText}
          />
        ))}
        <Transformer ref={transformerRef} />
      </Layer>
    </Stage>
  </div>
</div>



      )}
    </div>
  );
};

export default Plan;
