import React from "react";
import { View, Text } from "react-native";

type Props = {
  usuario: {
    nombre: string;
    reputacion: number;
  };
};

export default function ProfileScreen({ usuario }: Props) {
  return (
    <View>
      <Text>{usuario.nombre}</Text>
      <Text>⭐ {usuario.reputacion}</Text>
    </View>
  );
}