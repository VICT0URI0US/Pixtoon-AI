#chat {
  width: 100%;
  max-width: 850px;
  margin: 0 auto;
  padding: 40px 20px 150px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  box-sizing: border-box;
}

.msg {
  max-width: 68%;
  min-height: unset;
  height: auto;
  padding: 12px 18px;
  border-radius: 22px;
  line-height: 1.35;
  font-size: 16px;
  white-space: pre-wrap;
  word-wrap: break-word;
  animation: fadeUp .22s ease;
}

.msg b {
  display: block;
  margin-bottom: 8px;
  font-size: 15px;
  opacity: .85;
}

.user {
  align-self: flex-end;
  background: linear-gradient(135deg, #ef4444, #991b1b);
  border-bottom-right-radius: 7px;
  margin-left: auto;
  width: fit-content;
}
.bot {
  align-self: flex-start;
  background: #1d1d1d;
  color: white;
  border: 1px solid #2a2a2a;
  border-bottom-left-radius: 8px;
}

.inputBox {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  width: min(850px, 90%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: #151515;
  border: 1px solid #dc2626;
  border-radius: 40px;
  padding: 10px;
  box-shadow: 0 0 25px rgba(220, 38, 38, .15);
}

#message {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  font-size: 17px;
  outline: none;
  padding: 14px 18px;
}

#message::placeholder {
  color: #888;
}

#sendButton,
.sendBtn {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #ff4444, #b91c1c);
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: .2s;
  flex-shrink: 0;
}

#sendButton:hover,
.sendBtn:hover {
  transform: scale(1.08);
  box-shadow: 0 0 18px rgba(239, 68, 68, .45);
}

.empty {
  text-align: center;
  color: #999;
  margin-top: 120px;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}