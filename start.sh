#!/bin/bash

# note the server runs on port 3000 but manual iptables entry redirects traffic from 80 to 3000
# sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
source /home/vortex/.nvm/nvm.sh
npm start
