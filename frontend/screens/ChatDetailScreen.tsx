import React from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity } from "react-native";

type Mensaje = {
  id: number;
  mensaje: string;
  emisorId: number;
};

type Props = {
  mensajes: Mensaje[];
  nuevoMensaje: string;
  setNuevoMensaje: (text: string) => void;
  enviarMensaje: () => void;
  usuario: any;
};

export default function ChatDetailScreen({
  mensajes,
  nuevoMensaje,
  setNuevoMensaje,
  enviarMensaje,
  usuario
}: Props) {
  return (
    <View style={{flex:1}}>
      
      <FlatList
        data={mensajes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({item}) => (
          <View>
            <Text>{item.mensaje}</Text>
          </View>
        )}
      />

      <View style={{flexDirection:'row'}}>
        <TextInput
          value={nuevoMensaje}
          onChangeText={setNuevoMensaje}
          style={{flex:1, borderWidth:1}}
        />
        <TouchableOpacity onPress={enviarMensaje}>
          <Text>Enviar</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
``