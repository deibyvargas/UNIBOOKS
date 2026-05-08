import React from "react";
import { FlatList, TouchableOpacity, Text, View } from "react-native";

type Chat = {
  id: number;
  libroTitulo: string;
  ultimoMensaje: string;
};

type Props = {
  chats: Chat[];
  abrirChat: (chat: Chat) => void | Promise<void>;
};

export default function ChatScreen({ chats, abrirChat }: Props) {
  return (
    <FlatList
      data={chats}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({item}) => (
        <TouchableOpacity onPress={() => abrirChat(item)}>
          <View style={{ padding: 15 }}>
            <Text>{item.libroTitulo}</Text>
            <Text>{item.ultimoMensaje}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}