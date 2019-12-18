Steps to run the application
1. Run 'npm install' in this location
2. Install nginx and replace the contents of '/etc/nginx/sites-enabled/default' 
   with 'nginx-default-config' file. This to create a reverse proxy from nginx port 80 to node app port 5010
3. Install nginx-prometheus-exporter as per the instructions in https://github.com/nginxinc/nginx-prometheus-exporter
4. Run the app. 
    - node index.js
5. Run the nginx prometheus exporter
    - nginx-prometheus-exporter -nginx.scrape-uri http://localhost:80/nginx_status