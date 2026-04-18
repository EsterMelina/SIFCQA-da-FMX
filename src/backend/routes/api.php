<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

use App\Http\Controllers\{
    AuthController,
    UserController,
    AssociationController,
    PlayerController,
    QuotaController,
    PaymentController,
    TransferController,
    TournamentController,
    ReportController,
    AuditController
};

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {

    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/set-password', [AuthController::class, 'setPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});


/*
|--------------------------------------------------------------------------
| USERS (ADMIN ONLY)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('users', UserController::class);
    Route::patch('users/{user}/role', [UserController::class, 'updateRole']);
});


/*
|--------------------------------------------------------------------------
| ASSOCIATIONS (ADMIN + FMX)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin|fmx'])->group(function () {

    Route::get('associations', [AssociationController::class, 'index']);
    Route::get('associations/{association}', [AssociationController::class, 'show']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {

    Route::post('associations', [AssociationController::class, 'store']);
    Route::put('associations/{association}', [AssociationController::class, 'update']);
    Route::patch('associations/{association}/status', [AssociationController::class, 'toggleStatus']);
});


/*
|--------------------------------------------------------------------------
| PLAYERS
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin|fmx|association'])->group(function () {

    Route::get('players', [PlayerController::class, 'index']);
    Route::get('players/{player}', [PlayerController::class, 'show']);
    Route::get('players/{player}/eligibility', [PlayerController::class, 'eligibility']);
});

Route::middleware(['auth:sanctum'])->group(function () {

    Route::post('players', [PlayerController::class, 'store'])
        ->middleware('permission:create_player');

    Route::put('players/{player}', [PlayerController::class, 'update'])
        ->middleware('permission:edit_player');

    Route::patch('players/{player}/status', [PlayerController::class, 'toggleStatus'])
        ->middleware('permission:deactivate_player');
});


/*
|--------------------------------------------------------------------------
| PLAYER SELF SERVICE
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:player'])->group(function () {

    Route::get('players/me', [PlayerController::class, 'myProfile']);

    Route::patch('players/me', [PlayerController::class, 'updateMyProfile'])
        ->middleware('permission:edit_own_profile');

    Route::get('players/me/quotas', [QuotaController::class, 'myQuotas']);

    Route::post('players/me/payments', [PaymentController::class, 'payMyQuota'])
        ->middleware('permission:pay_quotas');

    Route::get('players/me/transfers', [TransferController::class, 'myTransfers']);

    Route::post('players/me/letters', [PlayerController::class, 'submitLetter'])
        ->middleware('permission:submit_letter');
});


/*
|--------------------------------------------------------------------------
| QUOTAS
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin|fmx|association'])->group(function () {

    Route::get('quotas', [QuotaController::class, 'index']);
    Route::get('players/{player}/quotas', [QuotaController::class, 'playerQuotas']);
});

Route::middleware(['auth:sanctum'])->group(function () {

    Route::post('quotas', [QuotaController::class, 'store'])
        ->middleware('permission:define_quota');
});


/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin|fmx|association'])->group(function () {

    Route::get('payments', [PaymentController::class, 'index']);
});

Route::middleware(['auth:sanctum'])->group(function () {

    Route::post('payments', [PaymentController::class, 'store'])
        ->middleware('permission:register_payment');

    Route::post('payments/{payment}/confirm', [PaymentController::class, 'confirm'])
        ->middleware('role:admin|fmx');
});


/*
|--------------------------------------------------------------------------
| TRANSFERS
|--------------------------------------------------------------------------
*/
// Route::middleware(['auth:sanctum', 'role:admin|fmx|association'])->group(function () {

//     Route::get('transfers', [TransferController::class, 'index']);
// });

// Route::middleware(['auth:sanctum'])->group(function () {

//     Route::post('transfers', [TransferController::class, 'store'])
//         ->middleware('permission:create_transfer');

//     Route::post('transfers/{transfer}/cancel', [TransferController::class, 'cancel'])
//         ->middleware('permission:create_transfer');

//     Route::get('players/{player}/transfers', [TransferController::class, 'playerTransfers']);
// });

Route::middleware(['auth:sanctum'])->group(function () {

    Route::post('transfers', [TransferController::class, 'store'])
        ->middleware('role:association');

    Route::post('transfers/{transfer}/cancel', [TransferController::class, 'cancel'])
        ->middleware('role:association');

    Route::get('players/{player}/transfers', [TransferController::class, 'playerTransfers']);
});


/*
|--------------------------------------------------------------------------
| TOURNAMENTS
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin|fmx'])->group(function () {

    Route::post('tournaments', [TournamentController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'role:admin|fmx|association'])->group(function () {

    Route::get('tournaments/{tournament}/eligible', [TournamentController::class, 'eligiblePlayers']);
});

Route::middleware(['auth:sanctum'])->group(function () {

    Route::post('tournaments/{tournament}/register', [TournamentController::class, 'registerPlayers'])
        ->middleware('permission:register_players');
});


/*
|--------------------------------------------------------------------------
| REPORTS (FMX + ADMIN)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin|fmx'])->group(function () {

    Route::get('reports/dashboard', [ReportController::class, 'dashboard']);
    Route::get('reports/players', [ReportController::class, 'players']);
    Route::get('reports/quotas', [ReportController::class, 'quotas']);
    Route::get('reports/transfers', [ReportController::class, 'transfers']);
    Route::get('reports/export', [ReportController::class, 'export']);
});


/*
|--------------------------------------------------------------------------
| AUDIT (FMX + ADMIN)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin|fmx'])->group(function () {

    Route::get('audit/logs', [AuditController::class, 'index']);
    Route::get('audit/logs/{id}', [AuditController::class, 'show']);

    Route::prefix('reports')->group(function () {
        Route::get('/dashboard', [ReportController::class, 'dashboard']);
    });

    Route::prefix('audit')->group(function () {
        Route::get('/logs', [AuditController::class, 'logs']);
    });
});


/*
|--------------------------------------------------------------------------
| PUBLIC DATA
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {

    Route::get('provinces', fn () =>
        \App\Models\Province::orderBy('name')->get()
    );
});