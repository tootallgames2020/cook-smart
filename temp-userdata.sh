#!/bin/bash
sudo apt update -y
sudo snap install amazon-ssm-agent --classic
sudo systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
sudo systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
git clone https://github.com/tootallgames2020/cook-smart.git /home/ubuntu/cook-smart
cd /home/ubuntu/cook-smart
git checkout fresh-project-migration
chown -R ubuntu:ubuntu /home/ubuntu/cook-smart