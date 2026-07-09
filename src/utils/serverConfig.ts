import AsyncStorage from '@react-native-async-storage/async-storage';

export const SERVER_IPS = {
  PC: '192.168.0.128',
  LAPTOP: '192.168.0.2',
  EMULATOR: '10.0.2.2',
};

export const SERVER_PORTS = {
  DEV: '8080',
  DOCKER: '80',
};

// backward compat
export const SERVERS = SERVER_IPS;

const SERVER_IP_KEY = 'selected_server_ip';
const SERVER_PORT_KEY = 'selected_server_port';

export const getServerIP = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem(SERVER_IP_KEY);
  return saved || SERVER_IPS.PC;
};

export const getServerPort = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem(SERVER_PORT_KEY);
  return saved || SERVER_PORTS.DEV;
};

export const setServerIP = async (ip: string): Promise<void> => {
  await AsyncStorage.setItem(SERVER_IP_KEY, ip);
};

export const setServerConfig = async (ip: string, port: string): Promise<void> => {
  await AsyncStorage.multiSet([[SERVER_IP_KEY, ip], [SERVER_PORT_KEY, port]]);
};

const buildBase = (ip: string, port: string): string =>
  port === '80' ? `http://${ip}` : `http://${ip}:${port}`;

export const getApiBaseURL = async (): Promise<string> => {
  if (!__DEV__) return 'http://citymarket.tech/api/v1';
  const [ip, port] = await Promise.all([getServerIP(), getServerPort()]);
  return `${buildBase(ip, port)}/api/v1`;
};

export const getSocketURL = async (): Promise<string> => {
  if (!__DEV__) return 'http://citymarket.tech';
  const [ip, port] = await Promise.all([getServerIP(), getServerPort()]);
  return buildBase(ip, port);
};
