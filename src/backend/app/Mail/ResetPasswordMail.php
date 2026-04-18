<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;


class ResetPasswordMail extends Mailable
{
    public string $link;

    public function __construct(string $link)
    {
        $this->link = $link;
    }

    public function build()
    {
        return $this->subject('Reset Password')
            ->view('emails.reset-password');
    }
}