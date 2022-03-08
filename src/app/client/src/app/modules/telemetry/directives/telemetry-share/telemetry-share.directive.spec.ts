
import {of as observableOf,  Observable } from 'rxjs';
import { TelemetryShareDirective } from './telemetry-share.directive';
import { TelemetryService, TELEMETRY_PROVIDER } from '../../services';
import {TestBed, ComponentFixture} from '@angular/core/testing';
import {eventData} from './telemetry-share.directive.spec.data';
import { ActivatedRoute, Data } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ElementRef, Component, DebugElement, ViewChild } from '@angular/core';
import { configureTestSuite } from '@sunbird/test-util';

describe('TelemetryShareDirective', () => {
  const env = 'workspace';
const fakeActivatedRoute = {
       data: {telemetry: {env: env}},
            snapshot: {
              parent: {
                url: [
                  {
                    path: 'workspace',
                  },
                  {
                    path: 'content',
                  },
                  {
                    path: 'limited-publish',
                  },
                ],
              }
            },
          };
  configureTestSuite();
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TelemetryShareDirective],
      providers: [TelemetryService, { provide: TELEMETRY_PROVIDER, useValue: EkTelemetry},
     {provide: ActivatedRoute, useValue: fakeActivatedRoute }]
    });
  });
  it('should take input and  generate the telemetry  share  event', () => {
    const telemetryService = TestBed.inject(TelemetryService);
    const activatedRoute = TestBed.inject(ActivatedRoute);
    const directive = new TelemetryShareDirective(telemetryService, activatedRoute);
    spyOn(telemetryService, 'share').and.callFake(() => observableOf(eventData.inputData));
    directive.appTelemetryShare = eventData.inputData;
    directive.ngOnInit();
    expect(directive.appTelemetryShare).toBeDefined();
    expect(directive.appTelemetryShare).toBe(eventData.inputData);
  });
});
