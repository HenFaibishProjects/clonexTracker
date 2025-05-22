import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import {join} from "path";

@Controller()
export class ActivationController {
    constructor(private readonly authService: AuthService) {}

    @Get('activate')
    async activate(@Query('token') token: string, @Res() res: Response) {
        const user = await this.authService.activateUser(token);
        if (!user) {
            return res.sendFile(join(__dirname, '..', 'public', 'activation-failed.html'));
        }

        return res.sendFile(join(__dirname, '..', 'public', 'activation-success.html'));
    }

}
