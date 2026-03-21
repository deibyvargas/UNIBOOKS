import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, FlatList, Alert, Image, StatusBar, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  // --- ESTADOS DE AUTENTICACIÓN ---
  const [estaLogueado, setEstaLogueado] = useState(false);
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');

  // --- ESTADOS DEL INVENTARIO ---
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagen, setImagen] = useState(null); 
  const [libros, setLibros] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const urlNgrok = 'https://elodia-nonhereditable-kittie.ngrok-free.dev';

  // --- LÓGICA DE FOTOS ---
  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permiso.granted === false) {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tus fotos para la portada.");
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.5,
    });

    if (!resultado.canceled) {
      setImagen(resultado.assets[0].uri);
    }
  };

  // --- LÓGICA DE LOGIN ---
  const manejarLogin = async () => {
    if (!correo || !password) {
        Alert.alert("Campos vacíos", "Por favor ingresa tu correo y contraseña.");
        return;
    }
    try {
      const response = await fetch(`${urlNgrok}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setEstaLogueado(true);
        Alert.alert("¡Bienvenido!", `Hola ${data.usuario}`);
        cargarLibros();
      } else {
        Alert.alert("Error de acceso", data.detail || "Credenciales incorrectas");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar al servidor.");
    }
  };

  // --- LÓGICA DEL INVENTARIO ---
  const cargarLibros = async () => {
    try {
      const response = await fetch(`${urlNgrok}/libros`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      setLibros(data);
    } catch (error) {
      console.error("Error al cargar:", error);
    }
  };

  useEffect(() => {
    if (estaLogueado) cargarLibros();
  }, [estaLogueado]);

  const librosFiltrados = libros.filter(libro => 
    libro.titulo.toLowerCase().includes(busqueda.toLowerCase()) || 
    libro.autor.toLowerCase().includes(busqueda.toLowerCase())
  );

  const prepararEdicion = (libro) => {
    setTitulo(libro.titulo);
    setAutor(libro.autor);
    setPrecio(libro.precio.toString());
    setEditandoId(libro.id);
    // Si tiene imagen en el servidor, la mostramos
    setImagen(libro.imagen_url ? `${urlNgrok}/${libro.imagen_url}` : null);
  };

  // ✅ FUNCIÓN CORREGIDA Y UNIFICADA
  const manejarGuardar = async () => {
    if (!titulo || !autor || !precio) {
      Alert.alert("⚠️ Error", "Llena todos los campos antes de guardar.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('autor', autor);
    formData.append('precio', precio.toString());

    if (imagen && !imagen.startsWith('http')) { 
      // Solo enviamos la imagen si es una URI local (nueva foto)
      const filename = imagen.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('imagen', {
        uri: imagen,
        name: filename,
        type: type,
      });
    }

    const url = editandoId ? `${urlNgrok}/libros/${editandoId}` : `${urlNgrok}/libros`;
    const metodo = editandoId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: metodo,
        body: formData,
        headers: {
          'Accept': 'application/json',
          // NO agregar Content-Type: multipart/form-data manualmente
        },
      });

      if (response.ok) {
        Alert.alert("✅ Éxito", editandoId ? "Libro actualizado" : "Libro y foto registrados");
        
        // Resetear estados
        setTitulo(''); 
        setAutor(''); 
        setPrecio(''); 
        setImagen(null);
        setEditandoId(null);
        cargarLibros(); 
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }));
        Alert.alert("❌ Error", errorData.detail || "El servidor rechazó la solicitud.");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      Alert.alert("❌ Error", "No hay conexión con el servidor. Revisa Ngrok.");
    } finally {
      setLoading(false);
    }
  };

  const eliminarLibro = (id, nombre) => {
    Alert.alert("🗑️ Eliminar", `¿Borrar "${nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, borrar", style: "destructive", onPress: async () => {
          await fetch(`${urlNgrok}/libros/${id}`, { method: 'DELETE' });
          cargarLibros();
        }
      }
    ]);
  };

  const renderLibro = ({ item }) => (
    <TouchableOpacity style={styles.libroCard} onPress={() => prepararEdicion(item)} activeOpacity={0.7}>
      {item.imagen_url && (
        <Image 
          source={{ uri: `${urlNgrok}/${item.imagen_url}` }} 
          style={{ width: 50, height: 70, borderRadius: 8, marginRight: 10 }} 
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.libroTitulo}>{item.titulo}</Text>
        <Text style={styles.libroAutor}>✍️ {item.autor}</Text>
        <Text style={styles.libroPrecio}>💰 ${item.precio.toLocaleString()}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarLibro(item.id, item.titulo)}>
        <Text style={styles.deleteButtonText}>Eliminar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!estaLogueado) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>UNIBOOKS</Text>
          <Text style={styles.loginSubtitle}>Gestión de Inventario</Text>
          <TextInput style={styles.inputLogin} placeholder="Correo institucional" value={correo} onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.inputLogin} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={true} />
          <TouchableOpacity style={styles.loginButton} onPress={manejarLogin}>
            <Text style={styles.buttonText}>ENTRAR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '90%', alignItems: 'center'}}>
            <View>
                <Text style={styles.title}>UNIBOOKS</Text>
                <Text style={styles.subtitle}>Panel Administrativo</Text>
            </View>
            <TouchableOpacity onPress={() => setEstaLogueado(false)}>
                <Text style={{color: '#FFCDD2', fontWeight: 'bold'}}>Salir</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <TextInput style={styles.searchInput} placeholder="🔍 Buscar libro o autor..." placeholderTextColor="#A5D6A7" value={busqueda} onChangeText={setBusqueda} />
      </View>

      <FlatList
        data={librosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLibro}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={[styles.formTitle, { color: editandoId ? '#E65100' : '#1B5E20' }]}>
              {editandoId ? "📝 Editar Detalles" : "➕ Registrar Libro"}
            </Text>
            
            <TextInput style={styles.inputInventario} placeholder="Título del Libro" value={titulo} onChangeText={setTitulo} />
            <TextInput style={styles.inputInventario} placeholder="Nombre del Autor" value={autor} onChangeText={setAutor} />
            <TextInput style={styles.inputInventario} placeholder="Precio sugerido" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
            
            {imagen && <Image source={{ uri: imagen }} style={styles.previewImage} />}
            <TouchableOpacity style={styles.imageButton} onPress={seleccionarImagen}>
                <Text style={styles.imageButtonText}>📷 {imagen ? "Cambiar Foto" : "Agregar Portada"}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.button, { backgroundColor: editandoId ? '#F57C00' : '#2E7D32' }]} 
                onPress={manejarGuardar}
                disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{editandoId ? "ACTUALIZAR" : "GUARDAR"}</Text>}
            </TouchableOpacity>

            {editandoId && (
              <TouchableOpacity onPress={() => {setEditandoId(null); setTitulo(''); setAutor(''); setPrecio(''); setImagen(null);}}>
                <Text style={styles.cancelLink}>Cancelar Edición</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.divider} />
            <Text style={styles.inventoryTitle}>Inventario Actual ({librosFiltrados.length})</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: '#1B5E20', justifyContent: 'center', alignItems: 'center' },
  loginCard: { backgroundColor: '#FFF', width: '85%', padding: 30, borderRadius: 25, elevation: 15, alignItems: 'center' },
  loginTitle: { fontSize: 36, fontWeight: '900', color: '#1B5E20', letterSpacing: 2 },
  loginSubtitle: { fontSize: 14, color: '#666', marginBottom: 25 },
  inputLogin: { backgroundColor: '#F5F5F5', width: '100%', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  loginButton: { backgroundColor: '#2E7D32', width: '100%', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 5 },
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { backgroundColor: '#1B5E20', paddingVertical: 20, alignItems: 'center', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#FFF' },
  subtitle: { color: '#A5D6A7', fontSize: 12 },
  searchSection: { padding: 15, marginTop: -20 },
  searchInput: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 5, fontSize: 16, color: '#1B5E20' },
  formCard: { backgroundColor: '#FFF', margin: 15, padding: 20, borderRadius: 20, elevation: 6 },
  formTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15, textAlign: 'center' },
  inputInventario: { backgroundColor: '#F1F8F1', padding: 12, borderRadius: 12, marginBottom: 12 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelLink: { textAlign: 'center', color: '#D32F2F', marginTop: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 20 },
  inventoryTitle: { fontSize: 18, fontWeight: '800', color: '#1B5E20', marginBottom: 10 },
  libroCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginVertical: 6, padding: 16, borderRadius: 15, flexDirection: 'row', alignItems: 'center', elevation: 3, borderLeftWidth: 5, borderLeftColor: '#2E7D32' },
  libroTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20' },
  libroAutor: { fontSize: 13, color: '#666' },
  libroPrecio: { fontSize: 16, fontWeight: '900', color: '#2E7D32' },
  deleteButton: { backgroundColor: '#FFEBEE', padding: 8, borderRadius: 10 },
  deleteButtonText: { color: '#D32F2F', fontSize: 11, fontWeight: 'bold' },
  imageButton: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2E7D32', borderStyle: 'dashed', alignItems: 'center', marginBottom: 15 },
  imageButtonText: { color: '#2E7D32', fontWeight: 'bold' },
  previewImage: { width: 100, height: 130, borderRadius: 10, alignSelf: 'center', marginBottom: 10, backgroundColor: '#EEE' },
});