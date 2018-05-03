import { DeleteComponent } from './../../../announcement/components/delete/delete.component';
// Import NG testing module(s)
import { async, ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Ng2IziToastModule } from 'ng2-izitoast';

// Import services
import { DraftComponent } from './draft.component';
import { SharedModule, PaginationService, ToasterService, ResourceService } from '@sunbird/shared';
import { SearchService, ContentService } from '@sunbird/core';
import { WorkSpaceService } from '../../services';
import { UserService, LearnerService, CoursesService, PermissionService } from '@sunbird/core';
import { Observable } from 'rxjs/Observable';

// Import Module
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
// Test data
import * as mockData from './draft.component.spec.data';
const testData = mockData.mockRes;
describe('DraftComponent', () => {
  let component: DraftComponent;
  let fixture: ComponentFixture<DraftComponent>;
  const fakeActivatedRoute = { 'params': Observable.from([{ 'pageNumber': 1 }]) };
  class RouterStub {
    navigate = jasmine.createSpy('navigate');
  }
  const resourceBundle = {
    'messages': {
      'fmsg': {
        'm0006': 'Fetching draft content failed, please try again',
        'm0022': 'Deleting content failed, please try again later..'
      },
      'stmsg': {
        'm0011': 'We are fetching draft content...',
        'm0008': 'no-results',
        'm0012': 'You dont have any draft content...'
      },
      'smsg': {
        'm0006': 'Content deleted successfully...'
      }
    }
  };
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DraftComponent],
      imports: [HttpClientTestingModule, Ng2IziToastModule, RouterTestingModule, SharedModule],
      providers: [PaginationService, WorkSpaceService, UserService,
        SearchService, ContentService, LearnerService, CoursesService,
        PermissionService, ResourceService, ToasterService,
        { provide: ResourceService, useValue: resourceBundle },
        { provide: Router, useClass: RouterStub },
        { provide: ActivatedRoute, useValue: fakeActivatedRoute }
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DraftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should call search api and returns result count more than 1', inject([SearchService], (searchService) => {
    spyOn(searchService, 'compositeSearch').and.callFake(() => Observable.of(testData.searchSuccessWithCountTwo));
    component.fetchDrafts(9, 1);
    fixture.detectChanges();
    expect(component.draftList).toBeDefined();
    expect(component.draftList.length).toBeGreaterThan(1);
  }));

  it('should call delete api and get success response', inject([WorkSpaceService, ActivatedRoute],
    (workSpaceService, activatedRoute, http) => {
      spyOn(workSpaceService, 'deleteContent').and.callFake(() => Observable.of(testData.deleteSuccess));
      spyOn(component, 'contentClick').and.callThrough();
      const params = { type: 'delete', content: { identifier: 'do_2124341006465925121871' } };
      component.contentClick(params);
      const DeleteParam = {
        contentIds: ['do_2124645735080755201259']
      };
      workSpaceService.deleteContent(DeleteParam).subscribe(
        apiResponse => {
          expect(apiResponse.responseCode).toBe('OK');
          expect(apiResponse.params.status).toBe('successful');
        }
      );
      fixture.detectChanges();
    }));

  // if  search api's throw's error
  it('should throw error', inject([SearchService], (searchService) => {
    spyOn(searchService, 'compositeSearch').and.callFake(() => Observable.throw({}));
    component.fetchDrafts(9, 1);
    fixture.detectChanges();
    expect(component.draftList.length).toBeLessThanOrEqual(0);
    expect(component.draftList.length).toEqual(0);
  }));

  it('should call setpage method and set proper page number', inject([Router],
    (route) => {
      component.pager = testData.pager;
      component.pager.totalPages = 8;
      component.navigateToPage(1);
      fixture.detectChanges();
      expect(route.navigate).toHaveBeenCalledWith(['workspace/content/draft', component.pageNumber]);
  }));

  it('should call deleteConfirmModal method to delte the content', inject([],
    () => {
      component.deleteConfirmModal('do_2124339707713126401772');
      expect(component.showLoader).toBeTruthy();
  }));

  it('should call setpage method and set proper page number 1', inject([Router],
    (route) => {
      component.pager = testData.pager;
      component.pager.totalPages = 0;
      component.navigateToPage(3);
      fixture.detectChanges();
      expect(component.pageNumber).toEqual(1);
  }));

  it('should call search api and returns result count 0', inject([SearchService], (searchService) => {
    spyOn(searchService, 'compositeSearch').and.callFake(() => Observable.of(testData.searchSuccessWithCountZero));
    component.fetchDrafts(9, 1);
    fixture.detectChanges();
    expect(component.draftList).toBeDefined();
    expect(component.draftList.length).toBe(0);
    expect(component.showLoader).toBeFalsy();
  }));

  it('should call navigateToContent to open content player when action type is not delete', inject([Router],
    (route) => {
      const params = { type: 'notdelete', content: { identifier: 'do_2124341006465925121871' } };
      component.contentClick(params);
      fixture.detectChanges();
      expect(component.pageNumber).toEqual(1);
  }));

});


