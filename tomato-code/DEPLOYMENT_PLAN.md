# EC2 Deployment Plan

This plan deploys the backend on one AWS EC2 instance with Docker Compose, Caddy as the HTTPS API gateway, MongoDB Atlas for data, Cloudinary for media, and a managed RabbitMQ provider such as CloudAMQP.

## 1. Prepare Third-Party Services

Create these before touching EC2:

- MongoDB Atlas cluster and database user.
- Cloudinary account and API keys.
- RabbitMQ URL from CloudAMQP or another managed RabbitMQ provider.
- Stripe API keys and webhook secret.
- Frontend hosting project on Vercel or Cloudflare Pages.

## 2. Configure Frontend

Set these frontend environment variables in Vercel or Cloudflare Pages:

```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_REALTIME_SERVICE_URL=https://api.your-domain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

Then deploy the frontend.

## 3. Create EC2 Instance

Recommended starting instance:

- Ubuntu 24.04 LTS.
- t3.micro/t3.small if covered by credits, or t4g.small if you are comfortable with ARM.
- Security group inbound: 22 from your IP, 80 from anywhere, 443 from anywhere.

## 4. Install Server Dependencies

SSH into EC2 and run:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and back in so the Docker group change applies.

## 5. Upload Code

Clone your repository:

```bash
git clone <your-repo-url>
cd tomato-code
```

Create the production env file:

```bash
cp .env.production.example .env
nano .env
```

Fill in real secrets. Do not commit `.env`.

Set your free backend hostname from the EC2 public IP. If your EC2 IP is `13.50.20.10`, use:

```env
BACKEND_HOST=13.50.20.10.sslip.io
ACME_EMAIL=your-email@example.com
```

## 6. Start Backend

Build and start all services:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check containers:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f gateway
```

Health check:

```bash
curl http://localhost/health
curl https://your-ec2-public-ip.sslip.io/health
```

## 7. Point Domain

In Cloudflare DNS:

- `api.your-domain.com` -> EC2 public IP.
- Proxy can be enabled after the first successful test.

If you are not using a paid domain, skip DNS and use:

```text
https://your-ec2-public-ip.sslip.io
```

In backend `.env`, set:

```env
FRONTEND_URL=https://your-frontend-domain.com
```

Restart after changing env:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 8. Stripe Webhook

In Stripe Dashboard, create a webhook endpoint:

```text
https://api.your-domain.com/api/payment/stripe/webhook
```

Without a paid domain, use:

```text
https://your-ec2-public-ip.sslip.io/api/payment/stripe/webhook
```

Copy the webhook secret into `STRIPE_WEBHOOK_SECRET` in `.env`, then restart Compose.

## 9. Verify User Flows

Test these in order:

- Login/signup.
- Restaurant list.
- Add restaurant/menu item image upload.
- Cart and checkout.
- Stripe payment callback.
- Order status updates.
- Rider live location/socket updates.

## 10. Enable Keep-Alive Watchdog

Docker Compose already uses `restart: unless-stopped`. For an extra EC2 safety net, enable the keep-alive timer:

```bash
chmod +x deploy/keep-alive.sh
sudo cp deploy/keep-alive.service /etc/systemd/system/keep-alive.service
sudo cp deploy/keep-alive.timer /etc/systemd/system/keep-alive.timer
sudo systemctl daemon-reload
sudo systemctl enable --now keep-alive.timer
```

Check it:

```bash
systemctl list-timers keep-alive.timer
sudo journalctl -u keep-alive.service -n 50
sudo tail -f /var/log/tomato-keep-alive.log
```

If your repo path is not `/home/ubuntu/tomato-code`, edit `APP_DIR` in `deploy/keep-alive.service` before copying it.

## 11. Scale Later

Start with one EC2 instance. When traffic grows:

- Move from one EC2 instance to an Auto Scaling Group.
- Put AWS ALB in front of EC2.
- Add Redis adapter before scaling `realtime` horizontally.
- Keep MongoDB, RabbitMQ, and Cloudinary managed.
