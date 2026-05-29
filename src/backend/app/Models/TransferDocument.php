<?php

// app/Models/TransferDocument.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Contracts\Filesystem\Filesystem;
class TransferDocument extends Model
{
    protected $fillable = [
        'transfer_id', 'uploaded_by', 'type',
        'path', 'disk', 'original_name', 'mime_type', 'size',
    ];

    public function transfer()
    {
        return $this->belongsTo(Transfer::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function url(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }
}