import { useContext } from 'react';
import { SocketContext } from './socketContextDefinition.js';

export function useSocket() {
  const context = useContext(SocketContext);
  return context;
}

export default useSocket;
