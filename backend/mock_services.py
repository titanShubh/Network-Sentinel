import socket
import threading
import time

def handle_client(client_socket, banner):
    try:
        client_socket.sendall(banner.encode())
        # Let scanner read the greeting banner
        time.sleep(1.0)
    except Exception:
        pass
    finally:
        try:
            client_socket.close()
        except Exception:
            pass

def start_mock_server(port, banner):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        # Bind to loopback inside the container
        server.bind(('127.0.0.1', port))
        server.listen(5)
        print(f"Mock service listener online on port {port}")
        while True:
            client, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(client, banner))
            t.daemon = True
            t.start()
    except Exception as e:
        print(f"Error on port {port}: {e}")

if __name__ == "__main__":
    # Define vulnerable mock banners to trigger different risk thresholds:
    # Port 21 (FTP) - Medium Risk
    # Port 23 (Telnet) - High Risk
    # Port 6379 (Redis) - Critical Risk (exposing Redis protocol signature)
    # Port 8000 (HTTP) - Backend FastAPI port is already active!
    services = [
        (21, "220 vsFTPd 3.0.3\r\n"),
        (23, "Welcome to Telnet Administration Console\r\nlogin: "),
        (6379, "+Redis server exposed without password\r\n")
    ]
    
    threads = []
    for port, banner in services:
        t = threading.Thread(target=start_mock_server, args=(port, banner))
        t.daemon = True
        t.start()
        threads.append(t)
        
    print("Mock vulnerable services starting...")
    # Keep main thread running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Mock services exiting.")
