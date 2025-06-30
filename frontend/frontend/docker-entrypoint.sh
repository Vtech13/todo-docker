#!/bin/sh
# Génère le fichier de config JS à partir des variables d'env
cat <<EOF > /usr/share/nginx/html/env.js
window.REACT_APP_API_URL = "${REACT_APP_API_URL}";
EOF

exec "$@" 