<?php

// app/Models/AssociationQuotaConfig.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssociationQuotaConfig extends Model
{
    protected $fillable = [
        'association_id',
        'annual_amount',
        'installments',
        'title_template',
        'auto_generate',
        'issue_month', 'issue_day',
        'due_month',   'due_day',
    ];

    protected $casts = [
        'annual_amount' => 'decimal:2',
        'auto_generate' => 'boolean',
    ];

    public function association()
    {
        return $this->belongsTo(Association::class);
    }

    public function resolveDueDate(int $year): string
    {
        return sprintf('%d-%02d-%02d', $year, $this->due_month, $this->due_day);
    }

    public function resolveTitle(int $year): string
    {
        return str_replace('{year}', $year, $this->title_template);
    }
}