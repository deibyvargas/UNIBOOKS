import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, FlatList, Alert, Image, StatusBar, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from './constants/Colors'; 

// 🚀 IMPORTACIONES DE FUENTES
import { 
  useFonts, 
  Montserrat_900Black, 
  Montserrat_700Bold 
} from '@expo-google-fonts/montserrat';
import { 
  OpenSans_400Regular, 
  OpenSans_600SemiBold 
} from '@expo-google-fonts/open-sans';

export default function App() {
  // --- CARGAR FUENTES ---
  let [fontsLoaded] = useFonts({
    'Montserrat-Black': Montserrat_900Black,
    'Montserrat-Bold': Montserrat_700Bold,
    'OpenSans-Regular': OpenSans_400Regular,
    'OpenSans-SemiBold': OpenSans_600SemiBold,
  });

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
    setImagen(libro.imagen_url ? `${urlNgrok}/${libro.imagen_url}` : null);
  };

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
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        Alert.alert("✅ Éxito", editandoId ? "Libro actualizado" : "Libro registrado");
        setTitulo(''); setAutor(''); setPrecio(''); setImagen(null); setEditandoId(null);
        cargarLibros(); 
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }));
        Alert.alert("❌ Error", errorData.detail || "El servidor rechazó la solicitud.");
      }
    } catch (error) {
      Alert.alert("❌ Error", "No hay conexión con el servidor.");
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
          style={{ width: 50, height: 70, borderRadius: 8, marginRight: 12 }} 
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.libroTitulo}>{item.titulo}</Text>
        <Text style={styles.libroAutor}>✍️ {item.autor}</Text>
        <Text style={styles.libroPrecio}>💰 ${item.precio.toLocaleString()}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarLibro(item.id, item.titulo)}>
        <Text style={styles.deleteButtonText}>Borrar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // --- PANTALLA DE CARGA ---
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.surface} />
      </View>
    );
  }

  // --- LOGIN ---
  if (!estaLogueado) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>UNIBOOKS</Text>
          <Text style={styles.loginSubtitle}>Gestión de Inventario</Text>
          <TextInput style={styles.inputLogin} placeholder="Correo institucional" value={correo} onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.gray} />
          <TextInput style={styles.inputLogin} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={true} placeholderTextColor={Colors.gray} />
          <TouchableOpacity style={styles.loginButton} onPress={manejarLogin}>
            <Text style={styles.buttonText}>ENTRAR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- PANEL PRINCIPAL ---
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
                <Text style={{color: Colors.window, fontWeight: 'bold', fontFamily: 'OpenSans-SemiBold'}}>Salir</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <TextInput style={styles.searchInput} placeholder="🔍 Buscar libro o autor..." placeholderTextColor={Colors.gray} value={busqueda} onChangeText={setBusqueda} />
      </View>

      <FlatList
        data={librosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLibro}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={[styles.formTitle, { color: editandoId ? Colors.warning : Colors.secondary }]}>
              {editandoId ? "📝 Editar Detalles" : "➕ Registrar Libro"}
            </Text>
            
            <TextInput style={styles.inputInventario} placeholder="Título del Libro" value={titulo} onChangeText={setTitulo} placeholderTextColor={Colors.gray} />
            <TextInput style={styles.inputInventario} placeholder="Nombre del Autor" value={autor} onChangeText={setAutor} placeholderTextColor={Colors.gray} />
            <TextInput style={styles.inputInventario} placeholder="Precio sugerido" keyboardType="numeric" value={precio} onChangeText={setPrecio} placeholderTextColor={Colors.gray} />
            
            {imagen && <Image source={{ uri: imagen }} style={styles.previewImage} />}
            <TouchableOpacity style={styles.imageButton} onPress={seleccionarImagen}>
                <Text style={styles.imageButtonText}>📷 {imagen ? "Cambiar Foto" : "Agregar Portada"}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.button, { backgroundColor: editandoId ? Colors.warning : Colors.secondary }]} 
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
  loginContainer: { flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  loginCard: { backgroundColor: Colors.surface, width: '85%', padding: 30, borderRadius: 25, elevation: 15, alignItems: 'center' },
  loginTitle: { fontSize: 36, fontFamily: 'Montserrat-Black', color: Colors.primary, letterSpacing: 2 },
  loginSubtitle: { fontSize: 14, fontFamily: 'OpenSans-Regular', color: Colors.gray, marginBottom: 25 },
  inputLogin: { fontFamily: 'OpenSans-Regular', backgroundColor: Colors.light, width: '100%', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: Colors.window },
  loginButton: { backgroundColor: Colors.secondary, width: '100%', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 5 },
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingVertical: 20, alignItems: 'center', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 8 },
  title: { fontSize: 26, fontFamily: 'Montserrat-Bold', color: Colors.surface },
  subtitle: { color: Colors.window, fontSize: 12, fontFamily: 'OpenSans-Regular' },
  searchSection: { padding: 15, marginTop: -20 },
  searchInput: { fontFamily: 'OpenSans-Regular', backgroundColor: Colors.surface, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 5, fontSize: 16, color: Colors.dark, borderWidth: 1, borderColor: Colors.window },
  formCard: { backgroundColor: Colors.surface, margin: 15, padding: 20, borderRadius: 20, elevation: 6 },
  formTitle: { fontSize: 16, fontFamily: 'Montserrat-Bold', marginBottom: 15, textAlign: 'center' },
  inputInventario: { fontFamily: 'OpenSans-Regular', backgroundColor: Colors.light, padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.window },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: Colors.surface, fontSize: 16, fontFamily: 'OpenSans-SemiBold' },
  cancelLink: { textAlign: 'center', color: Colors.error, marginTop: 15, fontFamily: 'OpenSans-SemiBold' },
  divider: { height: 1, backgroundColor: Colors.window, marginVertical: 20 },
  inventoryTitle: { fontSize: 18, fontFamily: 'Montserrat-Bold', color: Colors.dark, marginBottom: 10 },
  libroCard: { backgroundColor: Colors.surface, marginHorizontal: 15, marginVertical: 6, padding: 16, borderRadius: 15, flexDirection: 'row', alignItems: 'center', elevation: 3, borderLeftWidth: 5, borderLeftColor: Colors.secondary },
  libroTitulo: { fontSize: 16, fontFamily: 'OpenSans-SemiBold', color: Colors.dark },
  libroAutor: { fontSize: 13, fontFamily: 'OpenSans-Regular', color: Colors.gray },
  libroPrecio: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: Colors.secondary },
  deleteButton: { backgroundColor: '#FFEBEE', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.error },
  deleteButtonText: { color: Colors.error, fontSize: 11, fontFamily: 'OpenSans-SemiBold' },
  imageButton: { backgroundColor: Colors.light, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.secondary, borderStyle: 'dashed', alignItems: 'center', marginBottom: 15 },
  imageButtonText: { color: Colors.secondary, fontFamily: 'OpenSans-SemiBold' },
  previewImage: { width: 100, height: 130, borderRadius: 10, alignSelf: 'center', marginBottom: 10, backgroundColor: Colors.window },
});