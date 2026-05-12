import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, 
  FlatList, Alert, Image, StatusBar, ActivityIndicator, ScrollView, 
  KeyboardAvoidingView, Platform, Keyboard, Modal, Switch 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from './constants/Colors'; 
import { Libro } from './types';
import { useFonts } from 'expo-font';
import { 
  Montserrat_900Black, 
  Montserrat_700Bold 
} from '@expo-google-fonts/montserrat';
import { 
  OpenSans_400Regular, 
  OpenSans_600SemiBold 
} from '@expo-google-fonts/open-sans';

// --- CONFIGURACIÓN GLOBAL ---
// Cambia a la URL de Azure cuando hayas subido (deployed) el código del backend al App Service
const URL_PRODUCCION = 'https://unibooks-g3cjb8fmewd3efe8.canadacentral-01.azurewebsites.net';
const URL_LOCAL = 'http://192.168.56.1:8000';

const URL_BASE = URL_LOCAL; // Cambiado a LOCAL para desarrollo activo


// --- TIPOS ---
type SeccionActual = 'inicio' | 'inventario' | 'registro' | 'perfil' | 'misPublicaciones' | 'historial' | 'chat';
type EstadoLibro = 'Nuevo' | 'Buen estado' | 'Usado' | 'Dañado';
type TipoPublicacion = 'venta' | 'intercambio' | 'ambos';

// Interfaces
interface Transaccion {
  id: number;
  libro_id: number;
  libro_titulo: string;
  comprador_id: number;
  comprador_nombre: string;
  vendedor_id: number;
  vendedor_nombre: string;
  tipo: 'compra' | 'intercambio';
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'completado';
  precio?: number;
  fecha: string;
}

interface Calificacion {
  id: number;
  transaccion_id: number;
  calificado_id: number;
  calificador_id: number;
  estrellas: number;
  comentario: string;
  fecha: string;
}

interface Mensaje {
  id: number;
  chat_id: number;
  emisor_id: number;
  emisor_nombre: string;
  mensaje: string;
  fecha: string;
  leido: boolean;
}

interface Chat {
  id: number;
  libro_id: number;
  libro_titulo: string;
  usuario1_id: number;
  usuario2_id: number;
  ultimo_mensaje: string;
  ultima_fecha: string;
}

export default function App() {
  let [fontsLoaded] = useFonts({
    'Montserrat-Black': Montserrat_900Black,
    'Montserrat-Bold': Montserrat_700Bold,
    'OpenSans-Regular': OpenSans_400Regular,
    'OpenSans-SemiBold': OpenSans_600SemiBold,
  });

  // --- ESTADOS DE SESIÓN Y NAVEGACIÓN ---
  const [estaLogueado, setEstaLogueado] = useState<boolean>(false);
  const [seccionActual, setSeccionActual] = useState<SeccionActual>('inicio');
  const [esRegistro, setEsRegistro] = useState<boolean>(false);
  const [usuario, setUsuario] = useState<any>(null);

  // --- ESTADOS DE DATOS ---
  const [libros, setLibros] = useState<Libro[]>([]);
  const [librosDestacados, setLibrosDestacados] = useState<Libro[]>([]);
  const [misPublicaciones, setMisPublicaciones] = useState<Libro[]>([]);
  const [busqueda, setBusqueda] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [libroSeleccionado, setLibroSeleccionado] = useState<Libro | null>(null);

  // --- FILTROS ---
  const [filtros, setFiltros] = useState({
    carrera: '',
    tipo: '',
    estado: '',
    precioMin: '',
    precioMax: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // --- ESTADOS DE TRANSACCIONES Y CHAT ---
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<Transaccion[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatActivo, setChatActivo] = useState<Chat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  // --- ESTADOS FALTANTES ---
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [mostrarCalificar, setMostrarCalificar] = useState<Transaccion | null>(null);
  const [calificacionEstrellas, setCalificacionEstrellas] = useState(5);
  const [calificacionComentario, setCalificacionComentario] = useState('');


  // --- ESTADOS DE FORMULARIOS ---
  const [formLibro, setFormLibro] = useState({
    titulo: '', autor: '', precio: '', descripcion: '', categoria: 'Ingeniería',
    tipo: 'venta' as TipoPublicacion, 
    estado: 'Buen estado' as EstadoLibro,
    esDestacado: false,
    imagenes: [] as string[]
  });
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formUser, setFormUser] = useState({
    nombre: '', correo: '', password: '', carrera: '', semestre: ''
  });
  const [tecladoVisible, setTecladoVisible] = useState(false);

  useEffect(() => {
    const keyboardShow = Keyboard.addListener('keyboardDidShow', () => setTecladoVisible(true));
    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => setTecladoVisible(false));
    return () => { keyboardShow.remove(); keyboardHide.remove(); };
  }, []);

  // --- FUNCIONES DE CARGA ---
  const cargarDatos = useCallback(async () => {
    if (!usuario?.id) return;
    setLoading(true);
    try {
      // Creamos un controlador de aborto para manejar timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de espera

      const fetchConfig = { signal: controller.signal };

      const [resLibros, resDestacados, resMisPublicaciones, resTransacciones, resSolicitudes, resChats, resCalificaciones] = await Promise.all([
        fetch(`${URL_BASE}/libros`, fetchConfig),
        fetch(`${URL_BASE}/libros/destacados`, fetchConfig),
        fetch(`${URL_BASE}/usuarios/${usuario.id}/libros`, fetchConfig),
        fetch(`${URL_BASE}/usuarios/${usuario.id}/transacciones`, fetchConfig),
        fetch(`${URL_BASE}/usuarios/${usuario.id}/solicitudes`, fetchConfig),
        fetch(`${URL_BASE}/usuarios/${usuario.id}/chats`, fetchConfig),
        fetch(`${URL_BASE}/usuarios/${usuario.id}/calificaciones`, fetchConfig)
      ]);
      
      clearTimeout(timeoutId);

      if (resLibros.ok) setLibros(await resLibros.json());
      if (resDestacados.ok) setLibrosDestacados(await resDestacados.json());
      if (resMisPublicaciones.ok) setMisPublicaciones(await resMisPublicaciones.json());
      if (resTransacciones.ok) setTransacciones(await resTransacciones.json());
      if (resSolicitudes.ok) setSolicitudesPendientes(await resSolicitudes.json());
      if (resChats.ok) setChats(await resChats.json());
      if (resCalificaciones.ok) setCalificaciones(await resCalificaciones.json());

      // Cargar foto de perfil
      if (usuario.foto_perfil) {
        setFotoPerfil(`${URL_BASE}/uploads/${usuario.foto_perfil}`);
      }
    } catch (error: any) {
      console.error("Error al cargar datos:", error);
      if (error.name === 'AbortError') Alert.alert("Servidor Lento", "El servidor de Azure está tardando en responder. Intenta de nuevo en unos segundos.");
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => { if (estaLogueado && usuario) cargarDatos(); }, [estaLogueado, usuario, cargarDatos]);

  // --- AUTENTICACIÓN ---
  const validarCorreoUdec = (email: string) => email.endsWith('@ucundinamarca.edu.co');

  const manejarAuth = async () => {
    const correoLimpio = formUser.correo.trim().toLowerCase();
    const passwordLimpia = formUser.password;

    if (!correoLimpio || !passwordLimpia) return Alert.alert("Error", "Completa los campos.");
    
    if (esRegistro) {
      if (!validarCorreoUdec(correoLimpio)) {
        return Alert.alert("Acceso Restringido", "Para registrarte en Azure SQL, debes usar tu correo @ucundinamarca.edu.co");
      }
      setLoading(true);
      try {
        const res = await fetch(`${URL_BASE}/registro`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ ...formUser, correo: correoLimpio })
        });
        
        const data = await res.json();
        if (res.ok) { 
          Alert.alert("¡Registro Exitoso!", "Tu cuenta ha sido creada en la base de datos de Azure. Ahora puedes iniciar sesión."); 
          setEsRegistro(false);
          setFormUser({ nombre: '', correo: '', password: '', carrera: '', semestre: '' });
        } else {
          Alert.alert("Error del Servidor", data.detail || "El servidor rechazó el registro.");
        }
      } catch (e: any) { 
        console.error(e);
        Alert.alert("Error de Conexión", `No se pudo contactar al backend en: ${URL_BASE}\n\nDetalle: ${e.message}`); 
      } finally { setLoading(false); }
    } else {
      setLoading(true);
      try {
        const res = await fetch(`${URL_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correo: correoLimpio,
            password: passwordLimpia
          })
        });
        
        const data = await res.json();
        
        // Cambiamos la validación para aceptar 'usuario' o el objeto directo
        const usuarioValidado = data.usuario || data;

        if (res.ok && usuarioValidado && usuarioValidado.id) {
          setUsuario(usuarioValidado);
          setEstaLogueado(true);
          Alert.alert("Bienvenido", `Hola ${usuarioValidado.nombre}`);
        } else {
          Alert.alert("Error", data.detail || "Credenciales incorrectas");
        }
      } catch (error) {
        console.error("Error en login:", error);
        Alert.alert("Error", "Fallo de conexión con el servidor");
      } finally {
        setLoading(false);
      }
    }
  };

  // --- GESTIÓN DE LIBROS ---
  const seleccionarMultiplesImagenes = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.5 
    });
    if (!result.canceled && result.assets) {
      const uris = result.assets.map(asset => asset.uri);
      setFormLibro({...formLibro, imagenes: [...formLibro.imagenes, ...uris]});
    }
  };

  const eliminarImagen = (index: number) => {
    const nuevasImagenes = [...formLibro.imagenes];
    nuevasImagenes.splice(index, 1);
    setFormLibro({...formLibro, imagenes: nuevasImagenes});
  };

  const prepararEdicion = (item: Libro) => {
    setEditandoId(item.id);
    setFormLibro({
      titulo: item.titulo,
      autor: item.autor,
      precio: item.precio.toString(),
      descripcion: (item as any).descripcion || '',
      categoria: item.categoria || 'Ingeniería',
      tipo: (item as any).tipo_publicacion || 'venta',
      estado: (item as any).estado || 'Buen estado',
      esDestacado: item.destacado || false,
      imagenes: (item as any).imagenes ? (item as any).imagenes.split(',') : [`${URL_BASE}/${item.imagen_url}`]
    });
    setLibroSeleccionado(null);
    setSeccionActual('registro');
  };

  const manejarBorrarLibro = (id: number) => {
    Alert.alert("Eliminar", "¿Esta publicación será eliminada permanentemente?", [
      { text: "Cancelar" },
      { text: "Eliminar", onPress: async () => {
        try {
          const res = await fetch(`${URL_BASE}/libros/${id}`, { method: 'DELETE' });
          if (res.ok) { 
            cargarDatos(); 
            setLibroSeleccionado(null);
            Alert.alert("Éxito", "Publicación eliminada");
          } else {
            Alert.alert("Error", "No se pudo eliminar");
          }
        } catch (e) { Alert.alert("Error", "No se pudo eliminar"); }
      }}
    ]);
  };

  // --- FUNCIÓN GUARDAR LIBRO CORREGIDA ---
  const guardarLibro = async () => {
    if (!formLibro.titulo.trim()) {
      Alert.alert("Error", "El título es obligatorio");
      return;
    }
    if (!formLibro.autor.trim()) {
      Alert.alert("Error", "El autor es obligatorio");
      return;
    }
    if (!formLibro.precio || parseFloat(formLibro.precio) <= 0) {
      Alert.alert("Error", "El precio debe ser mayor a 0");
      return;
    }
    if (formLibro.imagenes.length === 0) {
      Alert.alert("Error", "Debes subir al menos una imagen");
      return;
    }
    
    if (!usuario || !usuario.id) {
      Alert.alert("Error", "Debes iniciar sesión para publicar un libro");
      return;
    }
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      
      formData.append('titulo', formLibro.titulo.trim());
      formData.append('autor', formLibro.autor.trim());
      formData.append('precio', formLibro.precio);
      formData.append('categoria', formLibro.categoria);
      formData.append('estado', formLibro.estado);
      formData.append('tipo', formLibro.tipo);
      formData.append('descripcion', formLibro.descripcion || '');
      formData.append('destacado', formLibro.esDestacado ? 'true' : 'false');
      formData.append('usuario_id', String(usuario.id));
      
      console.log('Enviando libro con usuario_id:', usuario.id);
      
      if (formLibro.imagenes[0] && !formLibro.imagenes[0].startsWith('http')) {
        const uri = formLibro.imagenes[0];
        const filename = uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        // @ts-ignore
        formData.append('imagen', {
          uri: uri,
          name: filename,
          type: type
        });
      }
      
      const url = editandoId ? `${URL_BASE}/libros/${editandoId}` : `${URL_BASE}/libros`;
      
      const response = await fetch(url, { 
        method: editandoId ? 'PUT' : 'POST', 
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const responseText = await response.text();
      console.log('Respuesta:', response.status, responseText);
      
      if (response.ok) {
        Alert.alert("Éxito", editandoId ? "Libro actualizado" : "Libro publicado");
        setEditandoId(null);
        setFormLibro({ 
          titulo: '', autor: '', precio: '', descripcion: '', categoria: 'Ingeniería', 
          tipo: 'venta', estado: 'Buen estado', esDestacado: false, imagenes: [] 
        });
        setSeccionActual('misPublicaciones');
        cargarDatos();
      } else {
        let errorMsg = "No se pudo guardar el libro";
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.detail || errorMsg;
        } catch(e) {}
        Alert.alert("Error", errorMsg);
      }
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert("Error", `Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIONES DE TRANSACCIONES ---
  const solicitarLibro = (libro: Libro) => {
    if (!usuario?.id) {
      Alert.alert("Error", "Debes iniciar sesión");
      return;
    }
    
    Alert.alert(
      "Solicitar Libro",
      `¿Deseas solicitar "${libro.titulo}"?`,
      [
        { text: "Cancelar" },
        { 
          text: "Solicitar", 
          onPress: async () => {
            try {
              const res = await fetch(`${URL_BASE}/solicitudes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  libro_id: libro.id,
                  solicitante_id: usuario.id,
                  propietario_id: (libro as any).usuario_id,
                  tipo: (libro as any).tipo_publicacion || 'compra'
                })
              });
              if (res.ok) {
                Alert.alert("Solicitud Enviada", "El dueño recibirá tu solicitud");
              } else {
                const error = await res.json();
                Alert.alert("Error", error.detail || "No se pudo enviar");
              }
            } catch (e) {
              Alert.alert("Error", "No se pudo enviar la solicitud");
            }
          }
        }
      ]
    );
  };

  const responderSolicitud = (solicitud: Transaccion, aceptar: boolean) => {
    Alert.alert(
      aceptar ? "Aceptar Solicitud" : "Rechazar Solicitud",
      aceptar ? `¿Confirmas la ${solicitud.tipo} de este libro?` : `¿Rechazar solicitud de ${solicitud.comprador_nombre}?`,
      [
        { text: "Cancelar" },
        { 
          text: aceptar ? "Aceptar" : "Rechazar", 
          onPress: async () => {
            try {
              const res = await fetch(`${URL_BASE}/solicitudes/${solicitud.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: aceptar ? 'aceptado' : 'rechazado' })
              });
              if (res.ok) {
                Alert.alert("Éxito", aceptar ? "Transacción confirmada" : "Solicitud rechazada");
                cargarDatos();
              }
            } catch (e) {
              Alert.alert("Error", "No se pudo procesar");
            }
          }
        }
      ]
    );
  };

  const abrirChat = async (chat: Chat) => {
    setChatActivo(chat);
    setLoading(true);
    try {
      const res = await fetch(`${URL_BASE}/chats/${chat.id}/mensajes`);
      if (res.ok) {
        const mensajesData = await res.json();
        setMensajes(mensajesData);
      }
    } catch (error) {
      console.error("Error cargando mensajes:", error);
    } finally {
      setLoading(false);
    }
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !chatActivo || !usuario) return;

    try {
      const res = await fetch(`${URL_BASE}/chats/${chatActivo.id}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emisor_id: usuario.id,
          emisor_nombre: usuario.nombre,
          mensaje: nuevoMensaje.trim()
        })
      });

      if (res.ok) {
        const mensajeNuevo = await res.json();
        setMensajes(prev => [...prev, mensajeNuevo]);
        setNuevoMensaje('');
        // Recargar chats para actualizar último mensaje
        cargarDatos();
      }
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      Alert.alert("Error", "No se pudo enviar el mensaje");
    }
  };

  // --- FUNCIONES DE CALIFICACIONES ---
  const abrirCalificar = (transaccion: Transaccion) => {
    setMostrarCalificar(transaccion);
    setCalificacionEstrellas(5);
    setCalificacionComentario('');
  };

  const enviarCalificacion = async () => {
    if (!mostrarCalificar || !usuario) return;

    try {
      const res = await fetch(`${URL_BASE}/calificaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaccion_id: mostrarCalificar.id,
          calificado_id: mostrarCalificar.vendedor_id === usuario.id ? mostrarCalificar.comprador_id : mostrarCalificar.vendedor_id,
          calificador_id: usuario.id,
          estrellas: calificacionEstrellas,
          comentario: calificacionComentario.trim()
        })
      });

      if (res.ok) {
        Alert.alert("¡Éxito!", "Calificación enviada correctamente");
        setMostrarCalificar(null);
        cargarDatos();
      } else {
        const error = await res.json();
        Alert.alert("Error", error.detail || "No se pudo enviar la calificación");
      }
    } catch (error) {
      console.error("Error enviando calificación:", error);
      Alert.alert("Error", "No se pudo enviar la calificación");
    }
  };

  // --- FUNCIONES DE FOTO DE PERFIL ---
  const seleccionarFotoPerfil = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar una foto de perfil');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFotoPerfil(result.assets[0].uri);
        await subirFotoPerfil(result.assets[0]);
      }
    } catch (error) {
      console.error('Error seleccionando foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  const tomarFotoPerfil = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar una foto');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFotoPerfil(result.assets[0].uri);
        await subirFotoPerfil(result.assets[0]);
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const subirFotoPerfil = async (asset: any) => {
    if (!usuario) return;

    try {
      const formData = new FormData();
      formData.append('foto_perfil', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `perfil_${usuario.id}.jpg`,
      } as any);

      const res = await fetch(`${URL_BASE}/usuarios/${usuario.id}/foto-perfil`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.ok) {
        Alert.alert('¡Éxito!', 'Foto de perfil actualizada');
        cargarDatos(); // Recargar datos del usuario
      } else {
        Alert.alert('Error', 'No se pudo subir la foto de perfil');
      }
    } catch (error) {
      console.error('Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo subir la foto de perfil');
    }
  };

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (stars: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => onRate && onRate(star)}
          >
            <Text style={[styles.star, rating >= star && styles.starFilled]}>
              {rating >= star ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // --- COMPONENTE RenderHistorial ---
  const RenderHistorial = () => {
    const misCompras = transacciones.filter(t => t.comprador_id === usuario?.id && t.estado === 'completado');
    const misVentas = transacciones.filter(t => t.vendedor_id === usuario?.id && t.estado === 'completado');
    const pendientes = solicitudesPendientes.filter(s => s.estado === 'pendiente');

    return (
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>📦 Mis Compras</Text>
        {misCompras.length > 0 ? (
          misCompras.map(trans => (
            <View key={trans.id} style={styles.transaccionCard}>
              <Text style={styles.transaccionTitulo}>{trans.libro_titulo}</Text>
              <Text style={styles.transaccionInfo}>Vendedor: {trans.vendedor_nombre}</Text>
              <Text style={styles.transaccionInfo}>Fecha: {new Date(trans.fecha).toLocaleDateString()}</Text>
            </View>
          ))
      ) : (
        <Text style={styles.noDataText}>No hay compras realizadas</Text>
      )}

      <Text style={styles.sectionTitle}>💰 Mis Ventas/Intercambios</Text>
      {misVentas.length > 0 ? (
        misVentas.map(trans => {
          const yaCalificado = Array.isArray(calificaciones) && calificaciones.some(c => c.transaccion_id === trans.id && c.calificador_id === usuario?.id);
          return (
            <View key={trans.id} style={styles.transaccionCard}>
              <Text style={styles.transaccionTitulo}>{trans.libro_titulo}</Text>
              <Text style={styles.transaccionInfo}>Comprador: {trans.comprador_nombre}</Text>
              <Text style={styles.transaccionInfo}>Tipo: {trans.tipo}</Text>
              <Text style={styles.transaccionInfo}>Fecha: {trans.fecha ? new Date(trans.fecha).toLocaleDateString() : 'N/A'}</Text>
              {!yaCalificado && (
                <TouchableOpacity 
                  style={styles.btnCalificar}
                  onPress={() => abrirCalificar(trans)}
                >
                  <Text style={styles.btnCalificarText}>⭐ Calificar Comprador</Text>
                </TouchableOpacity>
              )}
              {yaCalificado && (
                <Text style={styles.yaCalificadoText}>✓ Ya calificado</Text>
              )}
            </View>
          );
        })
      ) : (
        <Text style={styles.noDataText}>No hay ventas o intercambios realizados</Text>
      )}

      <Text style={styles.sectionTitle}>⏳ Solicitudes Pendientes</Text>
      {pendientes.length > 0 ? (
        pendientes.map(solicitud => (
          <View key={solicitud.id} style={styles.solicitudCard}>
            <Text style={styles.transaccionTitulo}>{solicitud.libro_titulo}</Text>
            <Text style={styles.transaccionInfo}>Solicitante: {solicitud.comprador_nombre}</Text>
            <Text style={styles.transaccionInfo}>Tipo: {solicitud.tipo}</Text>
            <View style={styles.solicitudActions}>
              <TouchableOpacity 
                style={[styles.solicitudBtn, styles.btnAceptar]}
                onPress={() => responderSolicitud(solicitud, true)}>
                <Text style={styles.btnText}>✓ Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.solicitudBtn, styles.btnRechazar]}
                onPress={() => responderSolicitud(solicitud, false)}>
                <Text style={styles.btnText}>✗ Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No hay solicitudes pendientes</Text>
      )}
      </ScrollView>
    );
  };

  // --- COMPONENTE RenderMisPublicaciones ---
  const RenderMisPublicaciones = () => (
    <FlatList
      data={misPublicaciones}
      keyExtractor={(item) => item.id.toString()}
      style={styles.content}
      renderItem={({item}) => (
        <View style={styles.publicacionCard}>
          <Image source={{ uri: `${URL_BASE}/${item.imagen_url}` }} style={styles.publicacionImg} />
          <View style={styles.publicacionInfo}>
            <Text style={styles.publicacionTitulo}>{item.titulo}</Text>
            <Text style={styles.publicacionAutor}>{item.autor}</Text>
            <Text style={styles.publicacionPrecio}>${item.precio}</Text>
            <View style={styles.publicacionEstado}>
              <Text style={[styles.estadoBadge, { backgroundColor: getEstadoColor((item as any).estado) }]}>{(item as any).estado}</Text>
              <Text style={styles.tipoBadge}>{(item as any).tipo_publicacion}</Text>
            </View>
            <View style={styles.publicacionActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => prepararEdicion(item)}>
                <Text style={styles.editBtnText}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => manejarBorrarLibro(item.id)}>
                <Text style={styles.deleteBtnText}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.noDataText}>No has publicado ningún libro</Text>}
    />
  );

  // --- COMPONENTE RenderChats ---
  const RenderChats = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>💬 Mis Conversaciones</Text>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.chatItem} onPress={() => abrirChat(item)}>
            <View style={styles.chatItemContent}>
              <Text style={styles.chatItemTitulo}>{item.libro_titulo}</Text>
              <Text style={styles.chatItemMsg} numberOfLines={1}>{item.ultimo_mensaje}</Text>
              <Text style={styles.chatItemFecha}>{item.ultima_fecha ? new Date(item.ultima_fecha).toLocaleDateString() : 'N/A'}</Text>
            </View>
            <Text style={styles.chatArrow}>▶</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.noDataText}>No tienes conversaciones activas</Text>}
      />
    </View>
  );

  const getEstadoColor = (estado: string) => {
    switch(estado) {
      case 'Nuevo': return '#4CAF50';
      case 'Buen estado': return '#8BC34A';
      case 'Usado': return '#FF9800';
      case 'Dañado': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  // --- COMPONENTE RenderPerfil ---
  const RenderPerfil = () => (
    <ScrollView style={styles.content}>
      <View style={styles.perfilCard}>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => {
          Alert.alert(
            'Cambiar foto de perfil',
            '¿Cómo quieres cambiar tu foto?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Tomar foto', onPress: tomarFotoPerfil },
              { text: 'Seleccionar de galería', onPress: seleccionarFotoPerfil },
            ]
          );
        }}>
          {fotoPerfil ? (
            <Image source={{ uri: fotoPerfil }} style={styles.avatarLarge} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTxt}>{usuario?.nombre?.[0]}</Text>
            </View>
          )}
          <View style={styles.editIcon}>
            <Text style={styles.editIconText}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.perfilNombre}>{usuario?.nombre}</Text>
        <Text style={styles.perfilCarrera}>{usuario?.carrera} • {usuario?.semestre} Semestre</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>⭐ {usuario?.reputacion || 5.0}</Text>
            <Text style={styles.statLabel}>Reputación</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{usuario?.transacciones || 0}</Text>
            <Text style={styles.statLabel}>Transacciones</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>
      {notificaciones.filter(n => !n.leida).length > 0 ? (
        notificaciones.filter(n => !n.leida).slice(0, 5).map(noti => (
          <View key={noti.id} style={styles.notiItem}>
            <Text style={styles.notiText}>{noti.mensaje}</Text>
            <Text style={styles.notiFecha}>{new Date(noti.fecha).toLocaleString()}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No hay notificaciones nuevas</Text>
      )}

      <TouchableOpacity style={styles.btnLogOut} onPress={() => setEstaLogueado(false)}>
        <Text style={styles.btnLogOutText}>CERRAR SESIÓN</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // --- FILTRADO DE LIBROS ---
  const librosFiltrados = libros.filter(libro => {
    let cumple = true;
    if (busqueda && !libro.titulo.toLowerCase().includes(busqueda.toLowerCase()) &&
        !libro.autor.toLowerCase().includes(busqueda.toLowerCase())) {
      cumple = false;
    }
    if (filtros.carrera && (libro as any).categoria !== filtros.carrera) cumple = false;
    if (filtros.tipo && (libro as any).tipo_publicacion !== filtros.tipo && (libro as any).tipo_publicacion !== 'ambos') cumple = false;
    if (filtros.estado && (libro as any).estado !== filtros.estado) cumple = false;
    if (filtros.precioMin && libro.precio < parseInt(filtros.precioMin)) cumple = false;
    if (filtros.precioMax && libro.precio > parseInt(filtros.precioMax)) cumple = false;
    return cumple;
  });

  if (!fontsLoaded) return <ActivityIndicator size="large" style={{flex:1}} color={Colors.primary}/>;

  if (!estaLogueado) {
    return (
      <SafeAreaView style={styles.loginFull}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%' }}>
          <ScrollView contentContainerStyle={styles.scrollLogin}>
            <View style={styles.loginCard}>
              <Text style={styles.loginLogo}>UNIBOOKS</Text>
              <Text style={styles.loginWelcome}>Acceso Institucional</Text>
              {esRegistro && (
                <>
                  <TextInput style={styles.largeInput} placeholder="Nombre completo" onChangeText={t => setFormUser({...formUser, nombre: t})} />
                  <TextInput style={styles.largeInput} placeholder="Carrera" onChangeText={t => setFormUser({...formUser, carrera: t})} />
                  <TextInput style={styles.largeInput} placeholder="Semestre" onChangeText={t => setFormUser({...formUser, semestre: t})} />
                </>
              )}
              <TextInput style={styles.largeInput} placeholder="Correo Institucional" autoCapitalize="none" onChangeText={t => setFormUser({...formUser, correo: t})} />
              <TextInput style={styles.largeInput} placeholder="Contraseña" secureTextEntry onChangeText={t => setFormUser({...formUser, password: t})} />
              <TouchableOpacity style={styles.btnLogin} onPress={manejarAuth}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnLoginText}>{esRegistro ? "REGISTRARME" : "ENTRAR"}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEsRegistro(!esRegistro)} style={{marginTop: 20}}>
                <Text style={styles.toggleText}>{esRegistro ? "¿Ya tienes cuenta? Ingresa" : "¿Nuevo estudiante? Regístrate"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>UNIBOOKS</Text>
            <Text style={styles.subtitle}>{seccionActual.toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.badgeNoti} onPress={() => setSeccionActual('perfil')}>
            <Text style={{color:'#fff', fontSize:10}}>{notificaciones.filter(n => !n.leida).length}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL DETALLE */}
      <Modal visible={!!libroSeleccionado} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {libroSeleccionado && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: `${URL_BASE}/${libroSeleccionado.imagen_url}` }} style={styles.modalImagenLarge} />
                <Text style={styles.modalFullTitle}>{libroSeleccionado.titulo}</Text>
                <Text style={styles.modalFullAutor}>{libroSeleccionado.autor}</Text>
                <Text style={styles.modalDescripcion}>{(libroSeleccionado as any).descripcion || "Sin descripción"}</Text>
                <View style={styles.modalTags}>
                  <Text style={styles.modalTag}>{(libroSeleccionado as any).estado}</Text>
                  <Text style={styles.modalTag}>{(libroSeleccionado as any).tipo_publicacion}</Text>
                </View>
                <Text style={styles.modalPrecio}>${libroSeleccionado.precio}</Text>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnSolicitar} onPress={() => solicitarLibro(libroSeleccionado)}>
                    <Text style={styles.btnSolicitarText}>📩 Solicitar</Text>
                  </TouchableOpacity>
                  
                  {(libroSeleccionado as any).usuario_id === usuario?.id && (
                    <>
                      <TouchableOpacity style={styles.btnEditDetail} onPress={() => prepararEdicion(libroSeleccionado)}>
                        <Text style={{color:'#fff', fontFamily:'Montserrat-Bold'}}>EDITAR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnDeleteDetail} onPress={() => manejarBorrarLibro(libroSeleccionado.id)}>
                        <Text style={{color:'#fff', fontFamily:'Montserrat-Bold'}}>BORRAR</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                
                <TouchableOpacity style={styles.btnCerrarModal} onPress={() => setLibroSeleccionado(null)}>
                  <Text style={styles.btnCerrarText}>Volver al Catálogo</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL CHAT */}
      <Modal visible={!!chatActivo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.chatModalContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderTitle}>{chatActivo?.libro_titulo}</Text>
              <TouchableOpacity onPress={() => setChatActivo(null)}>
                <Text style={styles.chatCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={mensajes}
              keyExtractor={(item) => item.id.toString()}
              style={styles.chatMessages}
              renderItem={({item}) => (
                <View style={[
                  styles.messageItem,
                  item.emisor_id === usuario?.id ? styles.messageOwn : styles.messageOther
                ]}>
                  {item.emisor_id !== usuario?.id && (
                    <Text style={styles.messageSender}>{item.emisor_nombre}:</Text>
                  )}
                  <Text style={[styles.messageBaseText, item.emisor_id === usuario?.id ? styles.messageOwnText : styles.messageOtherText]}>{item.mensaje}</Text>
                  <Text style={styles.messageTime}>
                    {item.fecha ? new Date(item.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.noMessagesText}>No hay mensajes aún</Text>}
            />

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Escribe un mensaje..."
                value={nuevoMensaje}
                onChangeText={setNuevoMensaje}
                multiline
              />
              <TouchableOpacity style={styles.chatSendBtn} onPress={enviarMensaje}>
                <Text style={styles.chatSendText}>📤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CALIFICACIÓN */}
      <Modal visible={!!mostrarCalificar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.calificarModalContent}>
            <Text style={styles.calificarTitle}>⭐ Calificar Usuario</Text>
            {mostrarCalificar && (
              <>
                <Text style={styles.calificarInfo}>
                  Califica tu experiencia con {mostrarCalificar.vendedor_id === usuario?.id ? (mostrarCalificar.comprador_nombre || 'Usuario') : (mostrarCalificar.vendedor_nombre || 'Usuario')}
                </Text>
                <Text style={styles.calificarLibro}>"{mostrarCalificar.libro_titulo}"</Text>

                <View style={styles.calificarStars}>
                  <Text style={styles.calificarLabel}>Estrellas:</Text>
                  {renderStars(calificacionEstrellas, true, setCalificacionEstrellas)}
                </View>

                <TextInput
                  style={styles.calificarComentario}
                  placeholder="Comentario opcional..."
                  value={calificacionComentario}
                  onChangeText={setCalificacionComentario}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.calificarActions}>
                  <TouchableOpacity 
                    style={[styles.calificarBtn, styles.btnCancelar]}
                    onPress={() => setMostrarCalificar(null)}
                  >
                    <Text style={styles.btnCancelarText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.calificarBtn, styles.btnEnviar]}
                    onPress={enviarCalificacion}
                  >
                    <Text style={styles.btnEnviarText}>Enviar Calificación</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <View style={{flex: 1}}>
        {seccionActual === 'inicio' && (
          <ScrollView style={styles.content}>
            <TextInput style={styles.searchInput} placeholder="🔍 Buscar por título, autor o palabra clave..." onChangeText={setBusqueda} />
            
            <TouchableOpacity style={styles.filtrosToggle} onPress={() => setMostrarFiltros(!mostrarFiltros)}>
              <Text style={styles.filtrosToggleText}>🔍 {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros Avanzados</Text>
            </TouchableOpacity>
            
            {mostrarFiltros && (
              <View style={styles.filtrosPanel}>
                <TextInput style={styles.filtroInput} placeholder="Carrera" value={filtros.carrera} onChangeText={t => setFiltros({...filtros, carrera: t})} />
                <View style={styles.filtrosRow}>
                  <TouchableOpacity style={[styles.filtroBtn, filtros.tipo === 'venta' && styles.filtroBtnActive]} onPress={() => setFiltros({...filtros, tipo: 'venta'})}>
                    <Text>Venta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.filtroBtn, filtros.tipo === 'intercambio' && styles.filtroBtnActive]} onPress={() => setFiltros({...filtros, tipo: 'intercambio'})}>
                    <Text>Intercambio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.filtroBtn, filtros.tipo === 'ambos' && styles.filtroBtnActive]} onPress={() => setFiltros({...filtros, tipo: 'ambos'})}>
                    <Text>Ambos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.filtroBtn} onPress={() => setFiltros({...filtros, tipo: ''})}>
                    <Text>Limpiar</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.filtrosPrecio}>
                  <TextInput style={styles.filtroInputPrecio} placeholder="Precio min" keyboardType="numeric" value={filtros.precioMin} onChangeText={t => setFiltros({...filtros, precioMin: t})} />
                  <TextInput style={styles.filtroInputPrecio} placeholder="Precio max" keyboardType="numeric" value={filtros.precioMax} onChangeText={t => setFiltros({...filtros, precioMax: t})} />
                </View>
              </View>
            )}
            
            <Text style={styles.sectionTitle}>✨ Destacados Udec</Text>
            <FlatList
              horizontal
              data={librosDestacados}
              keyExtractor={(item) => "d-"+item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.destacadoItem} onPress={() => setLibroSeleccionado(item)}>
                  <Image source={{uri: `${URL_BASE}/${item.imagen_url}`}} style={styles.destacadoImgSmall} />
                  <Text numberOfLines={1} style={styles.destacadoText}>{item.titulo}</Text>
                  <Text style={styles.destacadoPrecio}>${item.precio}</Text>
                </TouchableOpacity>
              )}
            />
            
            <Text style={styles.sectionTitle}>📚 Libros Recientes</Text>
            <FlatList
              horizontal
              data={librosFiltrados.slice(0, 10)}
              keyExtractor={(item) => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.destacadoItem} onPress={() => setLibroSeleccionado(item)}>
                  <Image source={{uri: `${URL_BASE}/${item.imagen_url}`}} style={styles.destacadoImgSmall} />
                  <Text numberOfLines={1} style={styles.destacadoText}>{item.titulo}</Text>
                  <Text style={styles.destacadoPrecio}>${item.precio}</Text>
                </TouchableOpacity>
              )}
            />
          </ScrollView>
        )}

        {seccionActual === 'inventario' && (
          <View style={{flex:1}}>
            <View style={{padding: 15}}>
              <TextInput style={styles.searchInput} placeholder="Filtrar catálogo..." value={busqueda} onChangeText={setBusqueda} />
            </View>
            <FlatList
              data={librosFiltrados}
              numColumns={2}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.gridCard} onPress={() => setLibroSeleccionado(item)}>
                  <Image source={{ uri: `${URL_BASE}/${item.imagen_url}` }} style={styles.gridImg} />
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridPrice}>${item.precio}</Text>
                    <Text numberOfLines={1} style={styles.gridTitle}>{item.titulo}</Text>
                    <Text style={styles.gridEstado}>{(item as any).estado}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.noDataText}>No se encontraron libros</Text>}
            />
          </View>
        )}

        {seccionActual === 'registro' && (
          <ScrollView contentContainerStyle={styles.formPadding}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{editandoId ? "Editar Publicación" : "Publicar Libro"}</Text>
              <TextInput style={styles.input} placeholder="Título *" value={formLibro.titulo} onChangeText={t => setFormLibro({...formLibro, titulo: t})} />
              <TextInput style={styles.input} placeholder="Autor *" value={formLibro.autor} onChangeText={t => setFormLibro({...formLibro, autor: t})} />
              <TextInput style={styles.input} placeholder="Descripción" multiline numberOfLines={3} value={formLibro.descripcion} onChangeText={t => setFormLibro({...formLibro, descripcion: t})} />
              <TextInput style={styles.input} placeholder="Precio *" keyboardType="numeric" value={formLibro.precio} onChangeText={t => setFormLibro({...formLibro, precio: t})} />
              
              <Text style={styles.label}>Estado del libro:</Text>
              <View style={styles.catRow}>
                {['Nuevo', 'Buen estado', 'Usado', 'Dañado'].map(e => (
                  <TouchableOpacity key={e} style={[styles.catBtn, formLibro.estado === e && styles.catBtnActive]} onPress={() => setFormLibro({...formLibro, estado: e as EstadoLibro})}>
                    <Text style={{color: formLibro.estado === e ? '#fff' : Colors.primary, fontSize: 12}}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Modo de transacción:</Text>
              <View style={styles.catRow}>
                {['venta', 'intercambio', 'ambos'].map(m => (
                  <TouchableOpacity key={m} style={[styles.catBtn, formLibro.tipo === m && styles.catBtnActive]} onPress={() => setFormLibro({...formLibro, tipo: m as TipoPublicacion})}>
                    <Text style={{color: formLibro.tipo === m ? '#fff' : Colors.primary, textTransform: 'capitalize'}}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Categoría:</Text>
              <TextInput style={styles.input} placeholder="Categoría" value={formLibro.categoria} onChangeText={t => setFormLibro({...formLibro, categoria: t})} />

              <View style={styles.destacadoSwitch}>
                <Text style={styles.label}>Marcar como destacado:</Text>
                <Switch value={formLibro.esDestacado} onValueChange={v => setFormLibro({...formLibro, esDestacado: v})} />
              </View>

              <Text style={styles.label}>Imágenes del libro:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagenesContainer}>
                {formLibro.imagenes.map((img, idx) => (
                  <View key={idx} style={styles.imagenPreviewContainer}>
                    <Image source={{uri: img}} style={styles.imagenPreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => eliminarImagen(idx)}>
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.imagePicker} onPress={seleccionarMultiplesImagenes}>
                  <Text style={styles.imagePickerText}>+ Agregar Imagen</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity style={styles.btnGuardar} onPress={guardarLibro}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>{editandoId ? "ACTUALIZAR" : "PUBLICAR"}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {seccionActual === 'perfil' && <RenderPerfil />}
        {seccionActual === 'historial' && <RenderHistorial />}
        {seccionActual === 'misPublicaciones' && <RenderMisPublicaciones />}
        {seccionActual === 'chat' && <RenderChats />}
      </View>

      {!tecladoVisible && (
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setSeccionActual('inicio')}>
            <Text style={[styles.tabText, seccionActual === 'inicio' && styles.tabActive]}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setSeccionActual('inventario')}>
            <Text style={[styles.tabText, seccionActual === 'inventario' && styles.tabActive]}>📚</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { setEditandoId(null); setFormLibro({...formLibro, imagenes: []}); setSeccionActual('registro'); }}>
            <Text style={[styles.tabText, seccionActual === 'registro' && styles.tabActive]}>➕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setSeccionActual('chat')}>
            <Text style={[styles.tabText, seccionActual === 'chat' && styles.tabActive]}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setSeccionActual('historial')}>
            <Text style={[styles.tabText, seccionActual === 'historial' && styles.tabActive]}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setSeccionActual('perfil')}>
            <Text style={[styles.tabText, seccionActual === 'perfil' && styles.tabActive]}>👤</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginFull: { flex: 1, backgroundColor: Colors.primary },
  scrollLogin: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  loginCard: { backgroundColor: '#fff', width: '90%', padding: 25, borderRadius: 30, alignItems: 'center' },
  loginLogo: { fontSize: 35, fontFamily: 'Montserrat-Black', color: Colors.primary },
  loginWelcome: { fontSize: 13, color: '#666', marginBottom: 25, fontFamily: 'OpenSans-Regular' },
  largeInput: { backgroundColor: '#f5f5f5', width: '100%', padding: 15, borderRadius: 15, marginBottom: 12, fontFamily: 'OpenSans-Regular' },
  btnLogin: { backgroundColor: Colors.primary, width: '100%', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  btnLoginText: { color: '#fff', fontFamily: 'Montserrat-Bold' },
  toggleText: { color: Colors.primary, fontFamily: 'OpenSans-SemiBold' },

  mainContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: Colors.primary, padding: 20, borderBottomRightRadius: 35 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 22, fontFamily: 'Montserrat-Black' },
  subtitle: { color: Colors.secondary, fontSize: 10, letterSpacing: 2 },
  badgeNoti: { backgroundColor: '#FF4136', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  content: { flex: 1, padding: 20 },
  searchInput: { backgroundColor: '#fff', padding: 15, borderRadius: 15, elevation: 3, marginBottom: 20, fontFamily: 'OpenSans-Regular' },
  sectionTitle: { fontSize: 18, fontFamily: 'Montserrat-Bold', marginBottom: 15, marginTop: 10, color: Colors.primary },
  
  filtrosToggle: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 15, alignItems: 'center' },
  filtrosToggleText: { color: Colors.primary, fontFamily: 'OpenSans-SemiBold' },
  filtrosPanel: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15 },
  filtroInput: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 10, marginBottom: 10, fontFamily: 'OpenSans-Regular' },
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  filtroBtn: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#f0f0f0', borderRadius: 10 },
  filtroBtnActive: { backgroundColor: Colors.primary },
  filtrosPrecio: { flexDirection: 'row', gap: 10 },
  filtroInputPrecio: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 10, fontFamily: 'OpenSans-Regular' },
  
  destacadoItem: { marginRight: 15, width: 120, alignItems: 'center' },
  destacadoImgSmall: { width: 120, height: 160, borderRadius: 12 },
  destacadoText: { fontSize: 12, marginTop: 5, fontFamily: 'OpenSans-SemiBold', textAlign: 'center' },
  destacadoPrecio: { fontSize: 11, color: Colors.primary, fontFamily: 'Montserrat-Bold', marginTop: 2 },

  gridCard: { flex: 0.5, backgroundColor: '#fff', margin: 8, borderRadius: 20, overflow: 'hidden', elevation: 3 },
  gridImg: { width: '100%', height: 180 },
  gridInfo: { padding: 10 },
  gridPrice: { fontFamily: 'Montserrat-Bold', color: Colors.primary, fontSize: 15 },
  gridTitle: { fontSize: 12, fontFamily: 'OpenSans-SemiBold', color: '#333', marginTop: 4 },
  gridEstado: { fontSize: 10, color: '#666', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '85%', padding: 20 },
  modalImagenLarge: { width: '100%', height: 350, borderRadius: 20 },
  modalFullTitle: { fontSize: 24, fontFamily: 'Montserrat-Bold', marginTop: 15 },
  modalFullAutor: { fontSize: 16, color: '#666', marginBottom: 10, fontFamily: 'OpenSans-Regular' },
  modalDescripcion: { fontSize: 14, color: '#333', marginBottom: 15, lineHeight: 20 },
  modalTags: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  modalTag: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, fontSize: 12 },
  modalPrecio: { fontSize: 22, fontFamily: 'Montserrat-Bold', color: Colors.primary, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnSolicitar: { flex: 1, backgroundColor: '#4CAF50', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnSolicitarText: { color: '#fff', fontFamily: 'Montserrat-Bold', fontSize: 16 },
  btnEditDetail: { flex: 1, backgroundColor: Colors.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
  btnDeleteDetail: { flex: 1, backgroundColor: '#FF4136', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnCerrarModal: { marginTop: 25, alignItems: 'center' },
  btnCerrarText: { color: '#999', fontFamily: 'OpenSans-SemiBold' },

  perfilCard: { backgroundColor: '#fff', padding: 25, borderRadius: 25, alignItems: 'center', elevation: 4 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarTxt: { color: '#fff', fontSize: 40, fontFamily: 'Montserrat-Black' },
  perfilNombre: { fontSize: 22, fontFamily: 'Montserrat-Bold', marginBottom: 5 },
  perfilCarrera: { color: '#666', fontFamily: 'OpenSans-Regular', marginBottom: 15 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 20, borderTopWidth: 1, borderColor: '#eee', paddingTop: 20 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 20, fontFamily: 'Montserrat-Bold', color: Colors.primary },
  statLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', marginTop: 5 },
  notiItem: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: Colors.secondary },
  notiText: { fontSize: 13, fontFamily: 'OpenSans-SemiBold' },
  notiFecha: { fontSize: 10, color: '#999', marginTop: 5 },
  noDataText: { textAlign: 'center', color: '#999', padding: 20, fontFamily: 'OpenSans-Regular' },
  btnLogOut: { marginTop: 30, padding: 15, alignItems: 'center' },
  btnLogOutText: { color: '#FF4136', fontFamily: 'Montserrat-Bold' },

  formPadding: { padding: 20 },
  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 25, elevation: 3 },
  formTitle: { fontSize: 20, fontFamily: 'Montserrat-Bold', marginBottom: 20, color: Colors.primary },
  input: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eee', fontFamily: 'OpenSans-Regular' },
  label: { fontFamily: 'OpenSans-SemiBold', marginTop: 10, marginBottom: 5, fontSize: 14 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  catBtn: { paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary, borderRadius: 10 },
  catBtnActive: { backgroundColor: Colors.primary },
  destacadoSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  imagenesContainer: { flexDirection: 'row', marginVertical: 10 },
  imagenPreviewContainer: { position: 'relative', marginRight: 10 },
  imagenPreview: { width: 100, height: 100, borderRadius: 10 },
  removeImageBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF4136', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeImageText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  imagePicker: { width: 100, height: 100, borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  imagePickerText: { fontSize: 10, color: '#999', textAlign: 'center' },
  btnGuardar: { backgroundColor: Colors.primary, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  btnGuardarText: { color: '#fff', fontFamily: 'Montserrat-Bold' },

  publicacionCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, marginBottom: 15, overflow: 'hidden', elevation: 2 },
  publicacionImg: { width: 100, height: 140 },
  publicacionInfo: { flex: 1, padding: 12 },
  publicacionTitulo: { fontSize: 16, fontFamily: 'Montserrat-Bold', marginBottom: 4 },
  publicacionAutor: { fontSize: 12, color: '#666', marginBottom: 4 },
  publicacionPrecio: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: Colors.primary, marginBottom: 6 },
  publicacionEstado: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, fontSize: 10, color: '#fff', overflow: 'hidden' },
  tipoBadge: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#e0e0e0', borderRadius: 5, fontSize: 10 },
  publicacionActions: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, backgroundColor: Colors.primary, padding: 8, borderRadius: 8, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 12 },
  deleteBtn: { flex: 1, backgroundColor: '#FF4136', padding: 8, borderRadius: 8, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 12 },

  transaccionCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  transaccionTitulo: { fontSize: 16, fontFamily: 'Montserrat-Bold', marginBottom: 8 },
  transaccionInfo: { fontSize: 12, color: '#666', marginBottom: 4 },

  solicitudCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  solicitudActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  solicitudBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  btnAceptar: { backgroundColor: '#4CAF50' },
  btnRechazar: { backgroundColor: '#F44336' },
  btnText: { color: '#fff', fontFamily: 'Montserrat-Bold' },

  chatItem: { backgroundColor: '#fff', padding: 15, marginBottom: 10, borderRadius: 15, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  chatItemContent: { flex: 1 },
  chatItemTitulo: { fontSize: 16, fontFamily: 'Montserrat-Bold', marginBottom: 5 },
  chatItemMsg: { fontSize: 12, color: '#666', marginBottom: 5 },
  chatItemFecha: { fontSize: 10, color: '#999' },
  chatArrow: { fontSize: 16, color: Colors.primary },

  chatModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '90%', padding: 0 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  chatHeaderTitle: { fontSize: 18, fontFamily: 'Montserrat-Bold', color: Colors.primary, flex: 1 },
  chatCloseBtn: { fontSize: 24, color: '#666', padding: 5 },
  chatMessages: { flex: 1, padding: 15 },
  messageItem: { marginBottom: 15, maxWidth: '80%' },
  messageOwn: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderRadius: 15, padding: 10 },
  messageOther: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderRadius: 15, padding: 10 },
  messageSender: { fontSize: 12, color: '#666', fontFamily: 'OpenSans-SemiBold', marginBottom: 5 },
  messageBaseText: { fontSize: 14, fontFamily: 'OpenSans-Regular' },
  messageOwnText: { color: '#fff' },
  messageOtherText: { color: '#333' },
  messageTime: { fontSize: 10, color: '#999', marginTop: 5, textAlign: 'right' },
  noMessagesText: { textAlign: 'center', color: '#999', padding: 20, fontFamily: 'OpenSans-Regular' },
  chatInputContainer: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
  chatInput: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontFamily: 'OpenSans-Regular', maxHeight: 100 },
  chatSendBtn: { backgroundColor: Colors.primary, width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  chatSendText: { fontSize: 18 },

  calificarModalContent: { backgroundColor: '#fff', margin: 20, borderRadius: 25, padding: 25, elevation: 5 },
  calificarTitle: { fontSize: 24, fontFamily: 'Montserrat-Bold', color: Colors.primary, textAlign: 'center', marginBottom: 20 },
  calificarInfo: { fontSize: 16, fontFamily: 'OpenSans-SemiBold', textAlign: 'center', marginBottom: 10 },
  calificarLibro: { fontSize: 14, fontFamily: 'OpenSans-Regular', textAlign: 'center', color: '#666', marginBottom: 25 },
  calificarStars: { alignItems: 'center', marginBottom: 20 },
  calificarLabel: { fontSize: 16, fontFamily: 'OpenSans-SemiBold', marginBottom: 10 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center' },
  star: { fontSize: 30, color: '#ddd', marginHorizontal: 5 },
  starFilled: { color: '#FFD700' },
  calificarComentario: { backgroundColor: '#f8f9fa', borderRadius: 15, padding: 15, fontFamily: 'OpenSans-Regular', textAlignVertical: 'top', marginBottom: 25 },
  calificarActions: { flexDirection: 'row', gap: 15 },
  calificarBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  btnCancelar: { backgroundColor: '#f0f0f0' },
  btnCancelarText: { color: '#666', fontFamily: 'Montserrat-Bold' },
  btnEnviar: { backgroundColor: Colors.primary },
  btnEnviarText: { color: '#fff', fontFamily: 'Montserrat-Bold' },

  btnCalificar: { backgroundColor: '#FFD700', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnCalificarText: { color: '#333', fontFamily: 'Montserrat-Bold', fontSize: 12 },
  yaCalificadoText: { color: '#4CAF50', fontFamily: 'OpenSans-SemiBold', fontSize: 12, textAlign: 'center', marginTop: 10 },

  avatarContainer: { position: 'relative', alignSelf: 'center', marginBottom: 15 },
  editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  editIconText: { fontSize: 14 },

  tabBar: { flexDirection: 'row', height: 70, backgroundColor: Colors.primary, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 10, paddingTop: 10 },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'OpenSans-SemiBold', textAlign: 'center' },
  tabActive: { color: Colors.secondary, fontSize: 11, fontWeight: 'bold' }
});