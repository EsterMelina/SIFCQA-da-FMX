<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; }
        .logo { width: 80px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { background: #eee; }
    </style>
</head>
<body>

<div class="header">
    <img src="{{ $logo }}" class="logo">
    <h2>Federação Nacional de Xadrez</h2>
    <p>Relatório Nacional de Jogadores</p>
    <p>Total: {{ $total }}</p>
    <p>Gerado em: {{ $generated_at }}</p>
</div>

<table>
    <thead>
        <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Associação</th>
            <th>Posição</th>
            <th>Activo</th>
            <th>Entrada</th>
            <th>Anos</th>
        </tr>
    </thead>
    <tbody>
        @foreach($players as $p)
        <tr>
            <td>{{ $p['player_id'] }}</td>
            <td>{{ $p['name'] }}</td>
            <td>{{ $p['email'] }}</td>
            <td>{{ $p['association_name'] }}</td>
            <td>{{ $p['position'] }}</td>
            <td>{{ $p['active'] ? 'Sim' : 'Não' }}</td>
            <td>{{ $p['joined_at'] }}</td>
            <td>{{ $p['years_in_association'] }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

</body>
</html>