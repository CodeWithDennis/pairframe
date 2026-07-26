<?php

declare(strict_types=1);

namespace App\Providers;

use Native\Desktop\Contracts\ProvidesPhpIni;
use Native\Desktop\Facades\Window;

class NativeAppServiceProvider implements ProvidesPhpIni
{
    /**
     * Executed once the native application has been booted.
     * Use this method to open windows, register global shortcuts, etc.
     */
    public function boot(): void
    {
        Window::open()
            ->title('Pairframe')
            ->width(1280)
            ->height(900)
            ->minWidth(960)
            ->minHeight(700)
            ->backgroundColor('#FAFAFA')
            ->rememberState()
            ->hideMenu();
    }

    /**
     * Return an array of php.ini directives to be set.
     */
    public function phpIni(): array
    {
        return [];
    }
}
