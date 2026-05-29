<?php
// app/Console/Commands/GenerateAnnualQuotas.php
namespace App\Console\Commands;

use App\Models\Association;
use App\Services\QuotaService;
use Illuminate\Console\Command;

class GenerateAnnualQuotas extends Command
{
    protected $signature   = 'quotas:generate-annual {year? : Ano (default: corrente)}';
    protected $description = 'Gera quotas anuais automáticas para todas as associações configuradas';

    public function handle(QuotaService $service): void
    {
        $year = (int) ($this->argument('year') ?? now()->year);

        $associations = Association::where('status', true)->get();

        $this->info("A gerar quotas para o ano {$year}...");

        foreach ($associations as $association) {
            $result = $service->generateAnnualQuotas($association, $year);

            if ($result['skipped'] === true) {
                $this->line("  [{$association->name}] ignorado — {$result['reason']}");
            } else {
                $this->info("  [{$association->name}] criadas: {$result['created']}, já existiam: {$result['skipped']}");
            }
        }

        $this->info('Concluído.');
    }
}