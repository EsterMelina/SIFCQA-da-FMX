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
    @if($logo)
        <img src="{{ $logo }}" class="logo">
    @endif
    <h2>Federação Moçambicana de Xadrez</h2>
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
            <th>Género</th>
            <th>Nascimento</th>
            <th>Associação</th>
            <th>Tipo</th>
            <th>Estudante</th>
            <th>FIDE ID</th>
            <th>Rating</th>
            <th>Activo</th>
            <th>Ingresso</th>
            <th>Anos</th>
            <th>Meses</th>
        </tr>
    </thead>
    <tbody>
        @foreach($players as $p)
        <tr>
            <td>{{ $p['player_id'] }}</td>
            <td>{{ $p['name'] }}</td>
            <td>{{ $p['email'] }}</td>
            <td>{{ $p['genero'] }}</td>
            <td>{{ $p['data_nascimento'] }}</td>
            <td>{{ $p['association_name'] }}</td>
            <td>{{ $p['membership'] }}</td>
            <td>{{ $p['is_student'] }}</td>
            <td>{{ $p['fide_id'] }}</td>
            <td>{{ $p['rating'] }}</td>
            <td>{{ $p['active'] }}</td>
            <td>{{ $p['joined_at'] }}</td>
            <td>{{ $p['years_in_association'] }}</td>
            <td>{{ $p['months_in_association'] }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

</body>
</html>