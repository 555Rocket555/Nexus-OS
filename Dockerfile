# 1. Usamos la imagen oficial de Nginx (servidor web ligero)
FROM nginx:alpine

# 2. Copiamos nuestra carpeta 'src' (donde está el index.html y js) 
# a la carpeta pública del servidor dentro del contenedor
COPY src /usr/share/nginx/html

# 3. (Opcional) Copiamos una configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 4. Exponemos el puerto 80
EXPOSE 80

# 5. Arrancamos Nginx
CMD ["nginx", "-g", "daemon off;"]