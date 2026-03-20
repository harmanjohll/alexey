! 

       implicit none

       integer     lattx,lattz,ztop,zbuff
       parameter   (lattx=1000,lattz=5000,ztop=20,zbuff=20)

       integer     oc(lattx,lattz),ht(lattx),hadd
       integer     xpick,zpick,xpick2,zpick2

       integer     nneigh,ndum,ndiff
       parameter   (nneigh=8,ndiff=2)
       integer     xdel(nneigh),zdel(nneigh)
       integer     xdiff(ndiff)

       integer     i,j,k,ocdum,oc1,oc2,iiter1,iiter2,niter1,niter2
       integer     idum,runtype
   
       real        rdum,theta,pdes,psi,pge,aveht,rmsht
       real        conc1(lattz),conc2(lattz),frac(lattz)

       real        deltaE,temp,esisi,egege,esige,esivc,egevc
       integer     isisi,igege,isige,isivc,igevc
       integer     fsisi,fgege,fsige,fsivc,fgevc

       integer     in,xn,zn,zmin,zmax,zstop,zlo

       integer     seed
       real        ran3
	
       integer     xdummy,zdummy,dumcount,envt
       integer     ndes,nsdf,bdiff,ngedes,nsides     !for events log
       integer     dumx,dumy,dumz

       open(10,file='input',status='old')
       read(10,*) seed
       read(10,*) runtype,envt
       read(10,*) niter1,niter2
       read(10,*) theta
       read(10,*) pdes,pge,psi
       read(10,*) temp
       read(10,*) esisi,esige,egege,esivc,egevc
       read(10,*) zstop,zlo
       close(10)

       niter2=niter2*lattx

       esisi=esisi*23.0*4184.0/(8.314*temp)
       egege=egege*23.0*4184.0/(8.314*temp)
       esige=esige*23.0*4184.0/(8.314*temp)
       esivc=esivc*23.0*4184.0/(8.314*temp)
       egevc=egevc*23.0*4184.0/(8.314*temp)

       open(10,file='log',status='new')
       open(20,file='conc',status='new')
       open(30,file='surf',status='new')
       open(40,file='oc',status='new')
       open(60,file='events',status='new')
       open(90,file='holes',status='new')

!      neighbours

       xdiff(1)=1
       
       xdiff(2)=-1

       xdel(1)=-1
       zdel(1)=0

       xdel(2)=0
       zdel(2)=-1

       xdel(3)=1
       zdel(3)=0

       xdel(4)=0
       zdel(4)=1

       xdel(5)=-1
       zdel(5)=-1

       xdel(6)=1
       zdel(6)=-1

       xdel(7)=1
       zdel(7)=1

       xdel(8)=-1
       zdel(8)=1

       if (runtype.eq.0) then    ! new run
   
!      initialization
       do i=1,lattx
       do k=1,ztop
        oc(i,k)=0
       enddo
       enddo

       do i=1,lattx
       ht(i)=ztop+1
       do k=ztop+1,lattz
        rdum=ran3(seed)
        if (rdum.le.theta) then
          oc(i,k)=2       ! Ge
        else
          oc(i,k)=1       ! Si
        end if
       enddo
       enddo

       else if (runtype.eq.1) then ! continuation

       open(31,file='osurf',status='old')
       open(41,file='ooc',status='old')
       open(91,file='oholes',status='old')

       do k=1,lattx
        read(31,*) idum,ht(k) 
       enddo

       do k=1,lattz
         read(41,40) (oc(i,k),i=1,lattx)
       enddo

       read(91,*)ndes
       do i=1,ndes                   !this is keyed in manually before starting a run that continues from a previous run
        read(91,*) dumx,dumy,dumz
        write(90,*) dumx,dumy,dumz   !make sure the data is compiled into one single file
        call flush(90)
       end do

       zmax=lattz
       do i=1,lattx
        if (ht(i).gt.zmin) then
         zmin=ht(i)
        end if
        if (ht(i).lt.zmax) then
         zmax=ht(i)
        end if
       enddo

       close(31)
       close(41)
       close(91)

       end if   ! runtype

       hadd=0
       ndes=0
       nsdf=0
       bdiff=0
       ngedes=0
       nsides=0


       do iiter1=1,niter1
       do iiter2=1,niter2

101      rdum=ran3(seed)*lattx
         xpick=int(rdum)+1
         if (xpick.lt.1.or.xpick.gt.lattx) go to 101

!102      rdum=ran3(seed)*(lattz-ht(xpick))
!         zpick=int(rdum)
!         zpick=zpick+ht(xpick)
!         if (zpick.lt.ht(xpick).or.zpick.gt.lattz) go to 102

102      rdum=ran3(seed)*lattz
         zpick=int(rdum)+1
         if (zpick.lt.ht(xpick).or.zpick.gt.lattz) go to 101


         if (zpick.eq.ht(xpick)) then    !   desorption

          if (oc(xpick,zpick).eq.0) then
           write(10,*) 'vacancy picked 1'
           write(10,*) xpick,zpick,oc(xpick,zpick)
           go to 999
          end if

   
          rdum=ran3(seed)

          if (rdum.le.pdes) then   ! desorption

           if (oc(xpick,zpick).eq.2) then
	    dumcount=0
            rdum=ran3(seed)
            if (rdum.le.pge) then
	     do i=1,nneigh
	      xdummy=xpick+xdel(i)
	      zdummy=zpick+zdel(i)
	      if(xdummy.lt.1)then
	       xdummy=xdummy+lattx
	      else if(xdummy.gt.lattx)then
	       xdummy=xdummy-lattx
	      end if
	      if(oc(xdummy,zdummy).ne.1)then     !either Ge or vac surrounding
	       dumcount=dumcount+1
	      end if
	     end do
	     if(dumcount.ge.envt)then
              write(90,*) xpick,zpick
  	      ndes=ndes+1
	      ngedes=ngedes+1
              oc(xpick,zpick)=0
              ht(xpick)=ht(xpick)+1
	     end if
            end if
           else if (oc(xpick,zpick).eq.1) then
	    dumcount=0
            rdum=ran3(seed)
            if (rdum.le.psi) then
	     do i=1,nneigh
	      xdummy=xpick+xdel(i)
	      zdummy=zpick+zdel(i)
	      if(xdummy.lt.1)then
	       xdummy=xdummy+lattx
	      else if(xdummy.gt.lattx)then
	       xdummy=xdummy-lattx
	      end if
	      if(oc(xdummy,zdummy).ne.1)then     !either Ge or vac surrounding
	       dumcount=dumcount+1
	      end if
	     end do
	     if(dumcount.ge.envt)then
              write(90,*) xpick,zpick
              ndes=ndes+1
    	      nsides=nsides+1
              oc(xpick,zpick)=0
              ht(xpick)=ht(xpick)+1
	     end if
            end if
           else
            write(10,*) 'top of column is vacant'
            stop
           end if
  
          else                     ! surface diffusion

104        rdum=ran3(seed)*ndiff
           ndum=int(rdum)+1
           if (ndum.lt.1.or.ndum.gt.ndiff) go to 104

           xpick2=xpick+xdiff(ndum)
           if (xpick2.gt.lattx) then
            xpick2=xpick2-lattx
           else if (xpick2.lt.1) then
            xpick2=xpick2+lattx
           end if

           zpick2=ht(xpick2)-1

           if (oc(xpick,zpick).ne.oc(xpick2,zpick2)) then 
           if (oc(xpick2,zpick2+1).ne.0) then

             oc1=oc(xpick,zpick)
             oc2=oc(xpick2,zpick2)

             isisi=0
             igege=0
             isige=0
             isivc=0
             igevc=0
             do in=1,nneigh
              xn=xpick+xdel(in)
              zn=zpick+zdel(in)
              if (xn.lt.1) then
               xn=xn+lattx
              else if (xn.gt.lattx) then
               xn=xn-lattx
              end if
              ocdum=oc(xn,zn)
              if (oc(xpick,zpick).eq.1) then
               if (ocdum.eq.1) then
                isisi=isisi+1
               else if (ocdum.eq.2) then
                isige=isige+1
               else if (ocdum.eq.0) then
                isivc=isivc+1
               end if
              else if (oc(xpick,zpick).eq.2) then
               if (ocdum.eq.1) then
                isige=isige+1
               else if (ocdum.eq.2) then
                igege=igege+1
               else if (ocdum.eq.0) then
                igevc=igevc+1
               end if
              end if
             enddo   ! looping over neighbors of (xpick,zpick)

             do in=1,nneigh
              xn=xpick2+xdel(in)
              zn=zpick2+zdel(in)
              if (xn.lt.1) then
               xn=xn+lattx
              else if (xn.gt.lattx) then
               xn=xn-lattx
              end if
              ocdum=oc(xn,zn)
              if (oc(xpick2,zpick2).eq.1) then
               if (ocdum.eq.1) then
                isisi=isisi+1
               else if (ocdum.eq.2) then
                isige=isige+1
               else if (ocdum.eq.0) then
                isivc=isivc+1
               end if
              else if (oc(xpick2,zpick2).eq.2) then
               if (ocdum.eq.1) then
                isige=isige+1
               else if (ocdum.eq.2) then
                igege=igege+1
               else if (ocdum.eq.0) then
                igevc=igevc+1
               end if
              else if (oc(xpick2,zpick2).eq.0) then
               if (ocdum.eq.1) then
                isivc=isivc+1
               else if (ocdum.eq.2) then
                igevc=igevc+1
               end if
              end if
             enddo   ! looping over neighbors of (xpick2,zpick2)

!            temporary switch to computed final neighbors
             oc(xpick,zpick)=oc2
             oc(xpick2,zpick2)=oc1

             fsisi=0
             fgege=0
             fsige=0
             fsivc=0
             fgevc=0
             do in=1,nneigh
              xn=xpick+xdel(in)
              zn=zpick+zdel(in)
              if (xn.lt.1) then
               xn=xn+lattx
              else if (xn.gt.lattx) then
               xn=xn-lattx
              end if
              ocdum=oc(xn,zn)
              if (oc(xpick,zpick).eq.1) then
               if (ocdum.eq.1) then
                fsisi=fsisi+1
               else if (ocdum.eq.2) then
                fsige=fsige+1
               else if (ocdum.eq.0) then
                fsivc=fsivc+1
               end if
              else if (oc(xpick,zpick).eq.2) then
               if (ocdum.eq.1) then
                fsige=fsige+1
               else if (ocdum.eq.2) then
                fgege=fgege+1
               else if (ocdum.eq.0) then
                fgevc=fgevc+1
               end if
              else if (oc(xpick,zpick).eq.0) then
               if (ocdum.eq.1) then
                fsivc=fsivc+1
               else if (ocdum.eq.2) then
                fgevc=fgevc+1
               end if
              end if
             enddo   ! looping over neighbors of (xpick,zpick)

             do in=1,nneigh
              xn=xpick2+xdel(in)
              zn=zpick2+zdel(in)
              if (xn.lt.1) then
               xn=xn+lattx
              else if (xn.gt.lattx) then
               xn=xn-lattx
              end if
              ocdum=oc(xn,zn)
              if (oc(xpick2,zpick2).eq.1) then
               if (ocdum.eq.1) then
                fsisi=fsisi+1
               else if (ocdum.eq.2) then
                fsige=fsige+1
               else if (ocdum.eq.0) then
                fsivc=fsivc+1
               end if
              else if (oc(xpick2,zpick2).eq.2) then
               if (ocdum.eq.1) then
                fsige=fsige+1
               else if (ocdum.eq.2) then
                fgege=fgege+1
               else if (ocdum.eq.0) then
                fgevc=fgevc+1
               end if
              end if
             enddo   ! looping over neighbors of (xpick2,zpick2)

!            switch back
             oc(xpick,zpick)=oc1
             oc(xpick2,zpick2)=oc2

!            energy
             deltaE=(esisi*(fsisi-isisi))+
     &              (egege*(fgege-igege))+
     &              (esige*(fsige-isige))+
     &              (esivc*(fsivc-isivc))+
     &              (egevc*(fgevc-igevc))

             if (deltaE.le.0.0) then
              nsdf=nsdf+1
              oc(xpick,zpick)=oc2
              oc(xpick2,zpick2)=oc1
              if (oc2.eq.0) then
               ht(xpick)=ht(xpick)+1
               ht(xpick2)=ht(xpick2)-1
              end if
             else
              deltaE=exp(-deltaE)
              rdum=ran3(seed)
              if (rdum.le.deltaE) then
               nsdf=nsdf+1
               oc(xpick,zpick)=oc2
               oc(xpick2,zpick2)=oc1
               if (oc2.eq.0) then
                ht(xpick)=ht(xpick)+1
                ht(xpick2)=ht(xpick2)-1
               end if
              end if
             end if
 
           end if   ! no overhangs
           end if   ! both sites occupied and species are diff

          end if    ! desorption or surface diffusion


         else if (zpick.lt.(lattz-zbuff)) then  !   diffusion

103       rdum=ran3(seed)*nneigh
          ndum=int(rdum)+1
          if (ndum.lt.1.or.ndum.gt.nneigh) go to 103
           xpick2=xpick+xdel(ndum)
           if (xpick2.gt.lattx) then
            xpick2=xpick2-lattx
           else if (xpick2.lt.1) then
            xpick2=xpick2+lattx
           end if

           zpick2=zpick+zdel(ndum)

           if (oc(xpick,zpick).eq.0) then
            write(10,*) 'vacancy picked 2'
            write(10,*) xpick,zpick
            stop
           end if
          
           if (oc(xpick,zpick).ne.0.and.
     &         oc(xpick2,zpick2).ne.0.and.
     &         oc(xpick,zpick).ne.oc(xpick2,zpick2)) then

             oc1=oc(xpick,zpick)
             oc2=oc(xpick2,zpick2)

             isisi=0
             igege=0
             isige=0
             isivc=0
             igevc=0
             do in=1,nneigh
              xn=xpick+xdel(in)
              zn=zpick+zdel(in)
              if (xn.lt.1) then
               xn=xn+lattx
              else if (xn.gt.lattx) then
               xn=xn-lattx
              end if
              ocdum=oc(xn,zn)
              if (oc(xpick,zpick).eq.1) then
               if (ocdum.eq.1) then
                isisi=isisi+1
               else if (ocdum.eq.2) then
                isige=isige+1
               else if (ocdum.eq.0) then
                isivc=isivc+1
               end if
              else if (oc(xpick,zpick).eq.2) then
               if (ocdum.eq.1) then
                isige=isige+1
               else if (ocdum.eq.2) then
                igege=igege+1
               else if (ocdum.eq.0) then
                igevc=igevc+1
               end if
              end if
             enddo   ! looping over neighbors of (xpick,zpick)

             do in=1,nneigh
              xn=xpick2+xdel(in)
              zn=zpick2+zdel(in)
              if (xn.lt.1) then
               xn=xn+lattx
              else if (xn.gt.lattx) then
               xn=xn-lattx
              end if
              ocdum=oc(xn,zn)
              if (oc(xpick2,zpick2).eq.1) then
               if (ocdum.eq.1) then
                isisi=isisi+1
               else if (ocdum.eq.2) then
                isige=isige+1
               else if (ocdum.eq.0) then
                isivc=isivc+1
               end if
              else if (oc(xpick2,zpick2).eq.2) then
               if (ocdum.eq.1) then
                isige=isige+1
               else if (ocdum.eq.2) then
                igege=igege+1
               else if (ocdum.eq.0) then
                igevc=igevc+1
               end if
              end if
             enddo   ! looping over neighbors of (xpick2,zpick2)

!            temporary switch to computed final neighbors
             oc(xpick,zpick)=oc2
             oc(xpick2,zpick2)=oc1

             fsisi=0
             fgege=0
             fsige=0
             fsivc=0
             fgevc=0
             do in=1,nneigh
              xn=xpick+xdel(in)
              zn=zpick+zdel(in)
              if (xn.lt.1) then
               xn=xn+lattx
              else if (xn.gt.lattx) then
               xn=xn-lattx
              end if
              ocdum=oc(xn,zn)
              if (oc(xpick,zpick).eq.1) then
               if (ocdum.eq.1) then
                fsisi=fsisi+1
               else if (ocdum.eq.2) then
                fsige=fsige+1
               else if (ocdum.eq.0) then
                fsivc=fsivc+1
               end if
              else if (oc(xpick,zpick).eq.2) then
               if (ocdum.eq.1) then
                fsige=fsige+1
               else if (ocdum.eq.2) then
                fgege=fgege+1
               else if (ocdum.eq.0) then
                fgevc=fgevc+1
               end if
              end if
             enddo   ! looping over neighbors of (xpick,zpick)

             do in=1,nneigh
              xn=xpick2+xdel(in)
              zn=zpick2+zdel(in)
              if (xn.lt.1) then
               xn=xn+lattx
              else if (xn.gt.lattx) then
               xn=xn-lattx
              end if
              ocdum=oc(xn,zn)
              if (oc(xpick2,zpick2).eq.1) then
               if (ocdum.eq.1) then
                fsisi=fsisi+1
               else if (ocdum.eq.2) then
                fsige=fsige+1
               else if (ocdum.eq.0) then
                fsivc=fsivc+1
               end if
              else if (oc(xpick2,zpick2).eq.2) then
               if (ocdum.eq.1) then
                fsige=fsige+1
               else if (ocdum.eq.2) then
                fgege=fgege+1
               else if (ocdum.eq.0) then
                fgevc=fgevc+1
               end if
              end if
             enddo   ! looping over neighbors of (xpick2,zpick2)

!            switch back
             oc(xpick,zpick)=oc1
             oc(xpick2,zpick2)=oc2

!            energy
             deltaE=(esisi*(fsisi-isisi))+
     &              (egege*(fgege-igege))+
     &              (esige*(fsige-isige))+
     &              (esivc*(fsivc-isivc))+
     &              (egevc*(fgevc-igevc))

             if (deltaE.le.0.0) then
	      bdiff=bdiff+1
              oc(xpick,zpick)=oc2
              oc(xpick2,zpick2)=oc1
             else
              deltaE=exp(-deltaE)
              rdum=ran3(seed)
              if (rdum.le.deltaE) then
	       bdiff=bdiff+1
               oc(xpick,zpick)=oc2
               oc(xpick2,zpick2)=oc1
              end if
             end if

           end if   ! both sites occupied and species are diff


          else      ! buffer zone

          rdum=ran3(seed)
          if (rdum.lt.theta) then
           oc(xpick,zpick)=2
          else
           oc(xpick,zpick)=1
          end if

          end if     ! zpick possibilities


       enddo      ! loop over iiter2

       aveht=0.0
       do i=1,lattx
        aveht=aveht+ht(i)
       enddo
       aveht=aveht/float(lattx)

       rmsht=0.0
       do i=1,lattx
        rmsht=rmsht+((ht(i)-aveht)*(ht(i)-aveht))
       enddo
       rmsht=rmsht/float(lattx)
       rmsht=sqrt(rmsht)

       rewind(20)
       do k=1,lattz
        oc1=0
        oc2=0
        do i=1,lattx
         if (oc(i,k).eq.1) then
          oc1=oc1+1
         else if (oc(i,k).eq.2) then
          oc2=oc2+1
         end if
        enddo
        conc1(k)=float(oc1)/float(lattx)
        conc2(k)=float(oc2)/float(lattx)
        if (oc1+oc2.ne.0) then     !made change here
         frac(k)=conc2(k)/(conc1(k)+conc2(k))
         write(20,*) k,conc1(k),conc2(k),frac(k)
        end if
       enddo
       call flush(20)

       zmin=1
       zmax=lattz
       do i=1,lattx
        if (ht(i).gt.zmin) then
         zmin=ht(i)
        end if
        if (ht(i).lt.zmax) then
         zmax=ht(i)
        end if
       enddo

       rewind(40)
       do k=1,lattz
         write(40,40) (oc(i,k),i=1,lattx)
       enddo
40     format(1x,500i1)

       rewind(30)
       do k=1,lattx
        write(30,30) k,ht(k)
       enddo
30     format(1x,2(i6,1x))
       call flush(30)
    

       write(10,10) iiter1,aveht+hadd,rmsht,
     &              zmin+hadd,zmax+hadd
10     format(1x,i6,2(f10.4,1x),2(i5,1x))
       call flush(10)

       write(60,601) ndes,nsdf,bdiff,ngedes,nsides
       call flush(60)

601    format(i8,1x,i15,1x,i15,1x,i8,1x,i8,1x)

       if (zmin.gt.zstop) then
        write(10,*) 'eaten beyond zstop ',zstop
        go to 999
       end if

!      shift
       if (zmin.gt.zlo) then


        do k=zmax-1,lattz
        do i=1,lattx
         oc(i,k+ztop-zmax+2)=oc(i,k)
        enddo 
        enddo 

        do k=lattz+1,lattz-ztop+zmax-2
        do i=1,lattx
         rdum=ran3(seed)
         if (rdum.le.theta) then
          oc(i,k+ztop-zmax+2)=2
         else
          oc(i,k+ztop-zmax+2)=1
         end if
        enddo 
        enddo 

        do i=1,lattx
         ht(i)=ht(i)-(zmax-ztop-2)    ! heights shifted by this amount
        enddo

        hadd=hadd+(zmax-ztop-2) 

        zmax=ztop+2
        zmin=zmin-(zmax-ztop-2)


       end if     ! shift 


       !niter1 usually goes up to 1000 or more iterations
       !print out files to keep track of surface as a function of time as well as the distribution of species
       
       if(iiter1.eq.1)then
        open(70,file='surf1',status='new')
	do k=1,lattx
	 write(70,30) k,ht(k)
        end do
        
        open(80,file='oc1',status='new')
	do k=1,lattz
	 write(80,40) (oc(i,k),i=1,lattx)
        end do
      
        close(70)
        close(80)

       else if(iiter1.eq.10)then
        open(70,file='surf10',status='new')
	do k=1,lattx
	 write(70,30) k,ht(k)
        end do
        
        open(80,file='oc10',status='new')
	do k=1,lattz
	 write(80,40) (oc(i,k),i=1,lattx)
        end do
      
        close(70)
        close(80)

       else if(iiter1.eq.20)then
        open(70,file='surf20',status='new')
	do k=1,lattx
	 write(70,30) k,ht(k)
        end do
        
        open(80,file='oc20',status='new')
	do k=1,lattz
	 write(80,40) (oc(i,k),i=1,lattx)
        end do
      
        close(70)
        close(80)

       else if(iiter1.eq.50)then
        open(70,file='surf50',status='new')
	do k=1,lattx
	 write(70,30) k,ht(k)
        end do
        
        open(80,file='oc50',status='new')
	do k=1,lattz
	 write(80,40) (oc(i,k),i=1,lattx)
        end do
      
        close(70)
        close(80)

       else if(iiter1.eq.100)then
        open(70,file='surf100',status='new')
	do k=1,lattx
	 write(70,30) k,ht(k)
        end do
        
        open(80,file='oc100',status='new')
	do k=1,lattz
	 write(80,40) (oc(i,k),i=1,lattx)
        end do
      
        close(70)
        close(80)

       else if(iiter1.eq.200)then
        open(70,file='surf200',status='new')
	do k=1,lattx
	 write(70,30) k,ht(k)
        end do
        
        open(80,file='oc200',status='new')
	do k=1,lattz
	 write(80,40) (oc(i,k),i=1,lattx)
        end do
      
        close(70)
        close(80)

       else if(iiter1.eq.500)then
        open(70,file='surf500',status='new')
	do k=1,lattx
	 write(70,30) k,ht(k)
        end do
        
        open(80,file='oc500',status='new')
	do k=1,lattz
	 write(80,40) (oc(i,k),i=1,lattx)
        end do
      
        close(70)
        close(80)

       end if


       enddo      ! loop over iiter1

999    rewind(40) 
       do k=1,lattz
         write(40,40) (oc(i,k),i=1,lattx)
       enddo

       rewind(30)
       do k=1,lattx
        write(30,30) k,ht(k)
       enddo


       stop
       end       





      FUNCTION ran3(idum)
      INTEGER idum
      INTEGER MBIG,MSEED,MZ
C     REAL MBIG,MSEED,MZ
      REAL ran3,FAC
      PARAMETER (MBIG=1000000000,MSEED=161803398,MZ=0,FAC=1./MBIG)
C     PARAMETER (MBIG=4000000.,MSEED=1618033.,MZ=0.,FAC=1./MBIG)
      INTEGER i,iff,ii,inext,inextp,k
      INTEGER mj,mk,ma(55)
C     REAL mj,mk,ma(55)
      SAVE iff,inext,inextp,ma
      DATA iff /0/
      if(idum.lt.0.or.iff.eq.0)then
        iff=1
        mj=abs(MSEED-abs(idum))
        mj=mod(mj,MBIG)
        ma(55)=mj
        mk=1
        do 11 i=1,54
          ii=mod(21*i,55)
          ma(ii)=mk
          mk=mj-mk
          if(mk.lt.MZ)mk=mk+MBIG
          mj=ma(ii)
11      continue
        do 13 k=1,4
          do 12 i=1,55
            ma(i)=ma(i)-ma(1+mod(i+30,55))
            if(ma(i).lt.MZ)ma(i)=ma(i)+MBIG
12        continue
13      continue
        inext=0
        inextp=31
        idum=1
      endif
      inext=inext+1
      if(inext.eq.56)inext=1
      inextp=inextp+1
      if(inextp.eq.56)inextp=1
      mj=ma(inext)-ma(inextp)
      if(mj.lt.MZ)mj=mj+MBIG
      ma(inext)=mj
      ran3=mj*FAC
      return
      END



      subroutine rangauss(xdum,ydum,variance,seed)

!       this program returns two random numbers distributed according to
!       exp[-alpha*(x - xm)^2]  
!       set the averages: meanx and meany
!       set the variance: variance = 1/(2*alpha)


         integer  seed
         real     ran3

        real     pi,tpi,xdum,ydum
        real     alpha,variance,meanx,meany
        real     wdum,tdum,zdum


        pi=acos(-1.0)
        tpi=2.0*pi


        alpha=0.5/variance
        meanx=0.0
        meany=0.0
        xdum=0
        ydum=0

        tdum=ran3(seed)*tpi
10      zdum=ran3(seed)
        if (zdum.eq.1.0) goto 10
        wdum=sqrt(-(log(1.0-zdum))/alpha)
        xdum=wdum*cos(tdum)
        xdum=xdum+meanx
        ydum=wdum*sin(tdum)
        ydum=ydum+meany

        return
        end subroutine rangauss


