import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AiService } from "../../services/ai.service";
import { Observable } from "rxjs";
import { Payload } from "../../types/payload";

@Component({
  selector: "app-payload-debug",
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="pd" *ngIf="payload$ | async as p">
    <pre>{{p | json}}</pre>
  </div>`,
  styles: [`
    .pd{ margin-top:10px; padding:10px 12px; border-radius:12px;
         background: linear-gradient(135deg, rgba(160,230,140,.20), rgba(150,140,255,.18));
         color:#2f2a64; width:min(520px, 90vw);}
    .row{ display:flex; justify-content:space-between; padding:4px 0; }
    b{ font-weight:700; }
  `]
})
export class PayloadDebugComponent {
  payload$: Observable<Payload>;
  constructor(ai: AiService){ this.payload$ = ai.getPayload$(); }
}
