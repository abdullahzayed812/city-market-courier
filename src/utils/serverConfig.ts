import AsyncStorage from '@react-native-async-storage/async-storage';

export const SERVERS = {
  PC: '192.168.0.128',
  LAPTOP: '192.168.0.2',
};

const SERVER_KEY = 'selected_server_ip';

export const getServerIP = async (): Promise<string> => {
  const savedIP = await AsyncStorage.getItem(SERVER_KEY);
  return savedIP || SERVERS.PC;
};

export const setServerIP = async (ip: string): Promise<void> => {
  await AsyncStorage.setItem(SERVER_KEY, ip);
};

export const getApiBaseURL = async (): Promise<string> => {
  const ip = await getServerIP();
  return `http://${ip}:3000/api/v1`;
};

export const getSocketURL = async (): Promise<string> => {
  const ip = await getServerIP();
  return `http://${ip}:3009`;
};
