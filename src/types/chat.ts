export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  conversation?: string;
}

export interface Conversation {
  id: string;
  topic: string;
  peerAddress: string;
  createdAt: Date;
  lastMessage?: Message;
}