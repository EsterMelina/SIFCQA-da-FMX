<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Defina a sua senha</title>
</head>
<body>
    <p>Olá, {{ $user->name }}.</p>

    <p>A sua conta foi criada com sucesso. Use o link abaixo para definir a sua senha:</p>
     
    $link = config('app.frontend_url') . "/set-password?token={$token}";
   
    <p>
       <a href="{{ $link }}">
          Definir palavra-passe
       </a>
    </p>

    <p>Este link expira em 24 horas.</p>
</body>
</html>
